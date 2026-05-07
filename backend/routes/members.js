const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');

const router = express.Router();

/**
 * List members with their request counts and recent issues.
 * Query params:
 *   q          search across phone / name / profileName / email / epicNo
 *   registered '1' to return only registered members
 */
router.get('/', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const onlyRegistered = req.query.registered === '1' || req.query.registered === 'true';
    const filter = {};
    if (q) {
      filter.$or = [
        { phone: new RegExp(q, 'i') },
        { profileName: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { epicNo: new RegExp(q, 'i') },
      ];
    }
    if (onlyRegistered) filter.isRegistered = true;

    const members = await Member.find(filter).sort({ lastSeenAt: -1 }).lean({ virtuals: true });

    const phones = members.map((m) => m.phone);

    // Live request counts (cached count on the member can drift).
    const counts = await ServiceRequest.aggregate([
      { $match: { phone: { $in: phones } } },
      { $group: { _id: '$phone', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));

    // Recent (≤5) issues per member, for inline display in the Members page.
    const issuesAgg = await ServiceRequest.aggregate([
      { $match: { phone: { $in: phones } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$phone',
          issues: {
            $push: {
              _id: '$_id',
              optionTitle: '$optionTitle',
              serviceTitle: '$serviceTitle',
              status: '$status',
              createdAt: '$createdAt',
            },
          },
        },
      },
      { $project: { _id: 1, issues: { $slice: ['$issues', 5] } } },
    ]);
    const issuesMap = Object.fromEntries(issuesAgg.map((g) => [g._id, g.issues]));

    const enriched = members.map((m) => ({
      ...m,
      requestCount: countMap[m.phone] || 0,
      recentIssues: issuesMap[m.phone] || [],
    }));

    res.json({ members: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Member details + their full request history. */
router.get('/:id', auth, async (req, res) => {
  try {
    let member = null;
    if (mongoose.isValidObjectId(req.params.id)) {
      member = await Member.findById(req.params.id).lean({ virtuals: true });
    }
    if (!member) {
      member = await Member.findOne({ phone: req.params.id }).lean({ virtuals: true });
    }
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const requests = await ServiceRequest.find({ phone: member.phone })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ member, requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'invalid id' });
    }
    await Member.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
