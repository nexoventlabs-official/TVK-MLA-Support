const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const FlowImage = require('../models/FlowImage');
const { IMAGE_KEYS, ensureKeysExist } = require('../services/flowImages');
const { uploadBuffer, uploadAutoBuffer, destroy } = require('../services/cloudinary');

function bustFlowCache() {
  try {
    const fe = require('./flowEndpoint');
    if (typeof fe.clearImageCache === 'function') fe.clearImageCache();
  } catch {
    /* ignore */
  }
}

const router = express.Router();

/** Quick lookup — which keys accept PDF uploads. */
function isPdfKey(key) {
  const spec = IMAGE_KEYS.find((k) => k.key === key);
  return spec?.group === 'pdf_documents';
}

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
      resourceType: doc.resourceType || 'image',
      updatedAt: doc.updatedAt || null,
    };
  });
  res.json({ images: items });
});

// PDF uploads flow through the permissive `upload.media` multer instance
// (any mime, 100 MB cap). Everything else keeps the strict image-only guard.
router.post(
  '/:key',
  auth,
  (req, res, next) => {
    const key = req.params.key;
    const mw = isPdfKey(key) ? upload.media.single('image') : upload.single('image');
    return mw(req, res, next);
  },
  async (req, res) => {
    try {
      const { key } = req.params;
      const spec = IMAGE_KEYS.find((k) => k.key === key);
      if (!spec) return res.status(400).json({ error: 'Unknown key' });
      if (!req.file) return res.status(400).json({ error: 'file required' });

      const existing = await FlowImage.findOne({ key });
      if (existing?.publicId) {
        await destroy(existing.publicId, { resource_type: existing.resourceType || 'image' }).catch(() => {});
      }

      const isPdf = spec.group === 'pdf_documents';
      let up;
      if (isPdf) {
        up = await uploadAutoBuffer(req.file.buffer, {
          folder: `tvk/flow/${key}`,
          originalName: req.file.originalname,
        });
      } else {
        up = await uploadBuffer(req.file.buffer, { folder: `tvk/flow/${key}` });
      }

      const resourceType = isPdf ? 'raw' : 'image';
      const doc = await FlowImage.findOneAndUpdate(
        { key },
        { $set: { url: up.secure_url, publicId: up.public_id, resourceType } },
        { upsert: true, new: true }
      );
      bustFlowCache();
      res.json({ image: doc });
    } catch (err) {
      console.error('[flowImages] upload error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/:key', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const doc = await FlowImage.findOne({ key });
    if (doc?.publicId) {
      await destroy(doc.publicId, { resource_type: doc.resourceType || 'image' }).catch(() => {});
    }
    await FlowImage.updateOne({ key }, { $set: { url: '', publicId: '', resourceType: 'image' } });
    bustFlowCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
