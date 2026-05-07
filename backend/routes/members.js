const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');

const router = express.Router();

/** List members with their request counts. */
router.get('/', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q
      ? {
          $or: [
            { phone: new RegExp(q, 'i') },
            { profileName: new RegExp(q, 'i') },
            { name: new RegExp(q, 'i') },
            { email: new RegExp(q, 'i') },
          ],
        }
      : {};
    const members = await Member.find(filter).sort({ lastSeenAt: -1 }).lean();

    // Compute live request counts (in case the cached count drifts)
    const phones = members.map((m) => m.phone);
    const counts = await ServiceRequest.aggregate([
      { $match: { phone: { $in: phones } } },
      { $group: { _id: '$phone', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    const enriched = members.map((m) => ({ ...m, requestCount: countMap[m.phone] || 0 }));

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
      member = await Member.findById(req.params.id).lean();
    }
    if (!member) {
      member = await Member.findOne({ phone: req.params.id }).lean();
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
