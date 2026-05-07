const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const FlowImage = require('../models/FlowImage');
const { IMAGE_KEYS, ensureKeysExist } = require('../services/flowImages');
const { uploadBuffer, destroy } = require('../services/cloudinary');

function bustFlowCache() {
  try {
    const fe = require('./flowEndpoint');
    if (typeof fe.clearImageCache === 'function') fe.clearImageCache();
  } catch {
    /* ignore */
  }
}

const router = express.Router();

/** List all flow image slots. */
router.get('/', auth, async (_req, res) => {
  await ensureKeysExist();
  const docs = await FlowImage.find({}).lean();
  const map = new Map(docs.map((d) => [d.key, d]));
  const items = IMAGE_KEYS.map((spec) => {
    const doc = map.get(spec.key) || {};
    return {
      key: spec.key,
      label: spec.label,
      group: spec.group,
      url: doc.url || '',
      publicId: doc.publicId || '',
      updatedAt: doc.updatedAt || null,
    };
  });
  res.json({ images: items });
});

router.post('/:key', auth, upload.single('image'), async (req, res) => {
  try {
    const { key } = req.params;
    if (!IMAGE_KEYS.find((k) => k.key === key)) return res.status(400).json({ error: 'Unknown key' });
    if (!req.file) return res.status(400).json({ error: 'image file required' });

    const existing = await FlowImage.findOne({ key });
    if (existing?.publicId) {
      await destroy(existing.publicId).catch(() => {});
    }

    const up = await uploadBuffer(req.file.buffer, { folder: `tvk/flow/${key}` });

    const doc = await FlowImage.findOneAndUpdate(
      { key },
      { $set: { url: up.secure_url, publicId: up.public_id } },
      { upsert: true, new: true }
    );
    bustFlowCache();
    res.json({ image: doc });
  } catch (err) {
    console.error('[flowImages] upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:key', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const doc = await FlowImage.findOne({ key });
    if (doc?.publicId) await destroy(doc.publicId).catch(() => {});
    await FlowImage.updateOne({ key }, { $set: { url: '', publicId: '' } });
    bustFlowCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
