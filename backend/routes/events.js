const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Event = require('../models/Event');
const { uploadBuffer, destroy } = require('../services/cloudinary');

const router = express.Router();

/**
 * GET /api/events
 *   Admin list. Returns all events (active + inactive) sorted by start date.
 *   Query ?upcoming=1 limits to active events whose toDate >= now.
 */
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.upcoming === '1') {
      filter.active = true;
      filter.toDate = { $gte: new Date() };
    }
    const events = await Event.find(filter).sort({ fromDate: 1 }).lean();
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Public endpoint used by the WhatsApp flow endpoint to render upcoming events.
 * Always limited to active + future events.
 */
router.get('/public/upcoming', async (_req, res) => {
  try {
    const events = await Event.find({ active: true, toDate: { $gte: new Date() } })
      .sort({ fromDate: 1 })
      .limit(20)
      .lean();
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, location, fromDate, toDate, active } = req.body;
    if (!title || !fromDate || !toDate) {
      return res.status(400).json({ error: 'title, fromDate and toDate are required' });
    }

    let imageUrl = '';
    let publicId = '';
    if (req.file) {
      const result = await uploadBuffer(req.file.buffer, { folder: 'tvk/events' });
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const ev = await Event.create({
      title: title.trim(),
      description: (description || '').trim(),
      location: (location || '').trim(),
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      image: imageUrl,
      publicId,
      active: active === 'false' || active === false ? false : true,
    });
    res.json({ event: ev });
  } catch (err) {
    console.error('[events] create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    const { title, description, location, fromDate, toDate, active } = req.body;
    if (title !== undefined) ev.title = String(title).trim();
    if (description !== undefined) ev.description = String(description);
    if (location !== undefined) ev.location = String(location);
    if (fromDate) ev.fromDate = new Date(fromDate);
    if (toDate) ev.toDate = new Date(toDate);
    if (active !== undefined) ev.active = active === 'true' || active === true;

    if (req.file) {
      if (ev.publicId) await destroy(ev.publicId).catch(() => {});
      const result = await uploadBuffer(req.file.buffer, { folder: 'tvk/events' });
      ev.image = result.secure_url;
      ev.publicId = result.public_id;
    }
    await ev.save();
    res.json({ event: ev });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (ev?.publicId) await destroy(ev.publicId).catch(() => {});
    await Event.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
