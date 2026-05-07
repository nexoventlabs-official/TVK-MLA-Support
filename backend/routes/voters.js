const express = require('express');
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');
const { listVoters, findVoterById, findVoterByEpic } = require('../services/voterDb');

const router = express.Router();

/**
 * Paginated list of voters from the read-only external voter DB.
 * Query params: q, assembly, page, limit
 */
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const q = (req.query.q || '').trim();
    const assembly = (req.query.assembly || '').trim();
    const result = await listVoters({ q, assembly, page, limit });
    res.json(result);
  } catch (err) {
    console.error('[voters] list failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * List of TVK members who completed voter registration.
 * (Used by the admin Members page when filtered to "Registered".)
 */
router.get('/registered/list', auth, async (req, res) => {
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
    const members = await Member.find(filter)
      .sort({ registeredAt: -1, lastSeenAt: -1 })
      .lean({ virtuals: true });
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * External voter lookup by EPIC number — used by registration flow + admin
 * verification. Kept for backward compatibility.
 */
router.get('/lookup/:epic', auth, async (req, res) => {
  try {
    const voter = await findVoterByEpic(req.params.epic);
    if (!voter) return res.status(404).json({ error: 'voter not found' });
    res.json({ voter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Voter detail by external _id or EPIC number. Cross-references the TVK
 * Member record and any service requests filed by that voter (matched on
 * Member.epicNo or, for manual registrations, by phone in voter snapshot).
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const voter = await findVoterById(req.params.id);
    if (!voter) return res.status(404).json({ error: 'voter not found' });

    // Is this voter also a registered TVK member? Match on EPIC.
    const member = voter.epicNo
      ? await Member.findOne({ epicNo: voter.epicNo }).lean({ virtuals: true })
      : null;

    let requests = [];
    if (member?.phone) {
      requests = await ServiceRequest.find({ phone: member.phone })
        .sort({ createdAt: -1 })
        .lean();
    }

    res.json({ voter, member, requests });
  } catch (err) {
    console.error('[voters] detail failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
