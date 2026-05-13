const express = require('express');
const auth = require('../middleware/auth');
const ServiceRequest = require('../models/ServiceRequest');
const { SERVICES } = require('../services/serviceCatalog');

const router = express.Router();

const STATUS_VALUES = ['pending', 'accepted', 'processing', 'completed', 'rejected'];

/** Static catalog of services + options (used by the admin UI). */
router.get('/catalog', auth, (_req, res) => {
  res.json({ services: SERVICES });
});

/** Admin list with optional filters. */
router.get('/', auth, async (req, res) => {
  try {
    const { status, serviceId, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (serviceId) filter.serviceId = serviceId;
    if (q) {
      filter.$or = [
        { ticketId: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { location: new RegExp(q, 'i') },
        { optionTitle: new RegExp(q, 'i') },
      ];
    }
    // Surface only ticketed rows by default — these are the ones admin acts on.
    if (req.query.allRows !== '1') filter.ticketId = { $ne: null };

    const items = await ServiceRequest.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ requests: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Single request detail (admin). */
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await ServiceRequest.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ request: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Update status / notes (admin). */
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status, notes } = req.body || {};
    const update = {};
    if (status && STATUS_VALUES.includes(status)) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const before = await ServiceRequest.findById(req.params.id).lean();
    const item = await ServiceRequest.findByIdAndUpdate(req.params.id, update, { new: true });

    // If the status actually changed, ping the citizen on their mobile app.
    if (item && before && update.status && before.status !== update.status) {
      setImmediate(async () => {
        try {
          const Member = require('../models/Member');
          const { sendPush } = require('../services/expoPush');
          const member = await Member.findOne({ phone: item.phone }).select('pushTokens').lean();
          const tokens = (member?.pushTokens || []).map((t) => t.token);
          if (tokens.length) {
            await sendPush(tokens, {
              title: `Ticket ${item.ticketId} · ${update.status}`,
              body: `Your grievance "${item.optionTitle || item.serviceTitle}" is now ${update.status}.`,
              data: { kind: 'status_change', ticketId: item.ticketId, status: update.status },
            });
          }
        } catch (err) {
          console.warn('[service-requests] push fan-out skipped:', err.message);
        }
      });
    }

    res.json({ request: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  await ServiceRequest.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
