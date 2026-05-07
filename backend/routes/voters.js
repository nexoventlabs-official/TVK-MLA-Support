const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');
const { findVoterByEpic } = require('../services/voterDb');

const router = express.Router();

/** List registered voters (= members where isRegistered=true). */
router.get('/', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = { isRegistered: true };
    if (q) {
      filter.$or = [
        { phone: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') },
        { profileName: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { epicNo: new RegExp(q, 'i') },
      ];
    }
    const voters = await Member.find(filter)
      .sort({ registeredAt: -1, lastSeenAt: -1 })
      .lean({ virtuals: true });
    res.json({ voters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** External (read-only) voter lookup by EPIC — useful for admin verification. */
router.get('/lookup/:epic', auth, async (req, res) => {
  try {
    const voter = await findVoterByEpic(req.params.epic);
    if (!voter) return res.status(404).json({ error: 'voter not found' });
    res.json({ voter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Single voter detail (snapshot + their service requests). */
router.get('/:id', auth, async (req, res) => {
  try {
    let member = null;
    if (mongoose.isValidObjectId(req.params.id)) {
      member = await Member.findById(req.params.id).lean({ virtuals: true });
    }
    if (!member) {
      member = await Member.findOne({ phone: req.params.id }).lean({ virtuals: true });
    }
    if (!member) {
      member = await Member.findOne({ epicNo: req.params.id.toUpperCase() }).lean({
        virtuals: true,
      });
    }
    if (!member) return res.status(404).json({ error: 'voter not found' });
    if (!member.isRegistered) {
      return res.status(404).json({ error: 'member is not registered yet' });
    }

    const requests = await ServiceRequest.find({ phone: member.phone })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ voter: member, requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
