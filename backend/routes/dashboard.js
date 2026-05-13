const express = require('express');
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');
const Campaign = require('../models/Campaign');
const { SERVICES } = require('../services/serviceCatalog');

const router = express.Router();

// ─── Time windows used by the dashboard visualisations ───────────
// Kept as constants so the frontend `data-since` window matches the
// numbers the admin sees on the page (and so we can tune them in
// one place if the admin asks for "last 60 days" later).
const DAY_MS = 24 * 60 * 60 * 1000;
const TIMELINE_DAYS = 30;
const HEATMAP_DAYS = 60;

// All date bucketing on the admin dashboard (timeline, weekday × hour
// heatmap, service × weekday heatmap, member growth) is rendered for
// admins in Mylapore, so it MUST be computed in IST — otherwise an
// event at 22:30 IST gets bucketed as 17:00 UTC the previous day and
// the heatmap reads two cells off. India has no DST, so a fixed zone
// string is safe.
const TZ_IST = 'Asia/Kolkata';

// Build a yyyy-mm-dd key from a Date in the IST wall clock. The
// 'en-CA' locale always returns ISO-style YYYY-MM-DD which lines up
// with what `$dateToString { format: '%Y-%m-%d', timezone: TZ_IST }`
// produces on the Mongo side, so the JS-side fill loop and the
// aggregation result use the same lookup keys.
const istDateKeyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ_IST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const istDateKey = (d) => istDateKeyFmt.format(d);

router.get('/stats', auth, async (_req, res) => {
  try {
    const now = new Date();
    const timelineSince = new Date(now.getTime() - TIMELINE_DAYS * DAY_MS);
    const heatmapSince = new Date(now.getTime() - HEATMAP_DAYS * DAY_MS);

    const [
      members,
      totalRequests,
      newRequests,
      inProgress,
      resolved,
      campaigns,
      approved,
      pending,
    ] = await Promise.all([
      Member.countDocuments(),
      ServiceRequest.countDocuments(),
      ServiceRequest.countDocuments({ status: 'new' }),
      ServiceRequest.countDocuments({ status: 'in_progress' }),
      ServiceRequest.countDocuments({ status: 'resolved' }),
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'APPROVED' }),
      Campaign.countDocuments({ status: 'PENDING' }),
    ]);

    // ─── Aggregations powering the dashboard charts ──────────────
    // Run them in parallel — Mongo handles them on indexed fields
    // (createdAt + status + serviceId are all indexed).
    const [
      byServiceRaw,
      timelineRaw,
      heatmapRaw,
      serviceHeatmapRaw,
      statusRaw,
      memberGrowthRaw,
    ] = await Promise.all([
      ServiceRequest.aggregate([
        { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      ]),
      ServiceRequest.aggregate([
        { $match: { createdAt: { $gte: timelineSince } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ_IST } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ServiceRequest.aggregate([
        { $match: { createdAt: { $gte: heatmapSince } } },
        {
          $group: {
            _id: {
              // Mongo $dayOfWeek returns 1=Sunday … 7=Saturday.
              // We re-map on the client to put Mon first, but the
              // raw value travels over the wire as-is. Both dow + hour
              // are bucketed in IST so an admin in Chennai sees "7pm
              // ticket" land at 19:00, not 13:30 (UTC).
              dow: { $dayOfWeek: { date: '$createdAt', timezone: TZ_IST } },
              hour: { $hour: { date: '$createdAt', timezone: TZ_IST } },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      // Service category × weekday matrix — answers "what kind of
      // grievance comes in on which day?". Same time window as the
      // hour-of-day heatmap so the two charts agree on totals.
      ServiceRequest.aggregate([
        { $match: { createdAt: { $gte: heatmapSince } } },
        {
          $group: {
            _id: {
              svc: '$serviceId',
              dow: { $dayOfWeek: { date: '$createdAt', timezone: TZ_IST } },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      ServiceRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Member.aggregate([
        { $match: { createdAt: { $gte: timelineSince } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ_IST } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Service distribution — keep ordered by SERVICES catalog so the
    // chart renders categories in the same order users see in the bot.
    const bySrv = Object.fromEntries(byServiceRaw.map((x) => [x._id, x.count]));
    const byService = SERVICES.map((s) => ({
      id: s.id,
      title: s.title,
      count: bySrv[s.id] || 0,
    }));

    // Backfill missing days with zero so the line chart has continuous
    // X-axis ticks even on a quiet office (instead of jumping over
    // dead days, which makes a dashboard read like a lie). The keys
    // are formatted in IST to match the aggregation output above —
    // building them via getUTCFullYear/Month/Date here would silently
    // miss the 5h30m wrap-around the day's last few tickets fall on.
    const fillDailySeries = (raw, days) => {
      const lookup = Object.fromEntries(raw.map((x) => [x._id, x.count]));
      const out = [];
      for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(now.getTime() - i * DAY_MS);
        const key = istDateKey(d);
        out.push({ date: key, count: lookup[key] || 0 });
      }
      return out;
    };

    const timeline = fillDailySeries(timelineRaw, TIMELINE_DAYS);
    const memberGrowth = fillDailySeries(memberGrowthRaw, TIMELINE_DAYS);

    // Heatmap: keep sparse {dow,hour,count} but normalise dow to 0-6
    // with Monday=0 for the client (cleaner UX than Sunday=1).
    const heatmap = heatmapRaw.map((x) => ({
      // Mongo: Sun=1..Sat=7 → JS: Mon=0..Sun=6
      dow: (x._id.dow + 5) % 7,
      hour: x._id.hour,
      count: x.count,
    }));

    // Service-category × weekday — same Mon-first remap, sparse rows
    // dropped on the client into the catalog-ordered matrix.
    const serviceHeatmap = serviceHeatmapRaw.map((x) => ({
      svc: x._id.svc,
      dow: (x._id.dow + 5) % 7,
      count: x.count,
    }));

    // Status breakdown — explicit zero defaults for every state so the
    // donut never has to special-case a missing key.
    const STATUSES = ['pending', 'accepted', 'processing', 'completed', 'rejected'];
    const statusBreakdown = STATUSES.reduce(
      (acc, k) => ({ ...acc, [k]: 0 }),
      {}
    );
    statusRaw.forEach((x) => {
      if (Object.prototype.hasOwnProperty.call(statusBreakdown, x._id)) {
        statusBreakdown[x._id] = x.count;
      }
    });

    const recentRequests = await ServiceRequest.find().sort({ createdAt: -1 }).limit(8).lean();
    const recentMembers = await Member.find().sort({ createdAt: -1 }).limit(5).lean();
    const recentCampaigns = await Campaign.find().sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      stats: {
        members,
        totalRequests,
        newRequests,
        inProgress,
        resolved,
        campaigns,
        approvedCampaigns: approved,
        pendingCampaigns: pending,
      },
      byService,
      timeline,
      memberGrowth,
      heatmap,
      serviceHeatmap,
      statusBreakdown,
      // Kept for backward-compat with any other consumer / older
      // frontend bundles still pinned to the previous response shape.
      recentRequests,
      recentMembers,
      recentCampaigns,
      meta: {
        timelineDays: TIMELINE_DAYS,
        heatmapDays: HEATMAP_DAYS,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
