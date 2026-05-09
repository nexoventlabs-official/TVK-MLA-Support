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
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
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
              // raw value travels over the wire as-is.
              dow: { $dayOfWeek: '$createdAt' },
              hour: { $hour: '$createdAt' },
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
              dow: { $dayOfWeek: '$createdAt' },
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
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
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
    // dead days, which makes a dashboard read like a lie).
    const fillDailySeries = (raw, days) => {
      const lookup = Object.fromEntries(raw.map((x) => [x._id, x.count]));
      const out = [];
      for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(now.getTime() - i * DAY_MS);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
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
