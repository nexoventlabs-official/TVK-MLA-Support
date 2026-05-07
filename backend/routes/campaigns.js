const express = require('express');
const auth = require('../middleware/auth');
const { media: mediaUpload } = require('../middleware/upload');
const Campaign = require('../models/Campaign');
const Member = require('../models/Member');
const meta = require('../services/metaCloud');
const { uploadAutoBuffer, destroy } = require('../services/cloudinary');

const router = express.Router();

/* ─────────────── Helpers ─────────────── */

const HEADER_FORMATS = ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'];

function parseButtons(raw) {
  if (!raw) return [];
  let arr;
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  } else arr = [];
  return arr
    .filter((b) => b && b.type && b.text)
    .slice(0, 10)
    .map((b) => ({
      type: b.type,
      text: String(b.text).slice(0, 25),
      url: b.url || '',
      phone_number: b.phone_number || '',
    }));
}

/** Build the WhatsApp template `components` array from a Campaign doc. */
function buildComponents(c) {
  const components = [];

  // Header
  if (c.headerType === 'TEXT' && c.headerText) {
    components.push({ type: 'HEADER', format: 'TEXT', text: c.headerText });
  } else if (c.headerType !== 'NONE' && c.headerType !== 'TEXT' && c.headerHandle) {
    components.push({
      type: 'HEADER',
      format: c.headerType,
      example: { header_handle: [c.headerHandle] },
    });
  }

  // Body (required)
  components.push({ type: 'BODY', text: c.bodyText });

  // Footer
  if (c.footerText) components.push({ type: 'FOOTER', text: c.footerText });

  // Buttons
  if (c.buttons && c.buttons.length) {
    const btns = c.buttons.map((b) => {
      if (b.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: b.text };
      if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.url };
      if (b.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone_number };
      return null;
    }).filter(Boolean);
    if (btns.length) components.push({ type: 'BUTTONS', buttons: btns });
  }

  return components;
}

/** Build the per-recipient `components` array used when *sending* an approved template. */
function buildSendComponents(c) {
  const components = [];
  // Media header → repeat the same media URL
  if (c.headerType === 'IMAGE' && c.headerMediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: c.headerMediaUrl } }],
    });
  } else if (c.headerType === 'VIDEO' && c.headerMediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'video', video: { link: c.headerMediaUrl } }],
    });
  } else if (c.headerType === 'DOCUMENT' && c.headerMediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'document', document: { link: c.headerMediaUrl } }],
    });
  }
  return components;
}

/* ─────────────── Routes ─────────────── */

router.get('/', auth, async (_req, res) => {
  try {
    const items = await Campaign.find().sort({ createdAt: -1 }).lean();
    res.json({ campaigns: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Campaign.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ campaign: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a campaign / template:
 *   1. Optionally upload header media to Cloudinary (for re-sending later)
 *   2. Upload media bytes to Meta /uploads to get a `header_handle`
 *   3. POST /{waba_id}/message_templates with the components built from the form
 *   4. Save the result locally with status from Meta (usually PENDING)
 *
 * Multipart fields:
 *   - name        (snake_case, required)
 *   - language    (default en_US)
 *   - category    (MARKETING / UTILITY / AUTHENTICATION)
 *   - headerType  (NONE / TEXT / IMAGE / VIDEO / DOCUMENT)
 *   - headerText  (when TEXT)
 *   - bodyText    (required)
 *   - footerText
 *   - buttons     (JSON array)
 *   - mediaFile   (multipart file when headerType is IMAGE/VIDEO/DOCUMENT)
 */
router.post('/', auth, mediaUpload.single('mediaFile'), async (req, res) => {
  try {
    const {
      name,
      language = 'en_US',
      category = 'MARKETING',
      headerType = 'NONE',
      headerText = '',
      bodyText,
      footerText = '',
      buttons,
    } = req.body;

    if (!name || !/^[a-z0-9_]+$/.test(name)) {
      return res.status(400).json({ error: 'name must be lower_snake_case (a-z, 0-9, _).' });
    }
    if (!bodyText || !bodyText.trim()) return res.status(400).json({ error: 'bodyText required' });
    if (!HEADER_FORMATS.includes(headerType)) return res.status(400).json({ error: 'invalid headerType' });

    // Reject duplicate name in DB early
    const existing = await Campaign.findOne({ name });
    if (existing) return res.status(409).json({ error: 'Template name already exists.' });

    let headerMediaUrl = '';
    let headerMediaPublicId = '';
    let headerHandle = '';

    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
      if (!req.file) return res.status(400).json({ error: `${headerType} header requires a media file.` });
      // 1. Upload to Cloudinary for re-use when sending
      const up = await uploadAutoBuffer(req.file.buffer, {
        folder: `tvk/templates/${name}`,
        originalName: req.file.originalname,
      });
      headerMediaUrl = up.secure_url;
      headerMediaPublicId = up.public_id;

      // 2. Upload to Meta /uploads → media handle
      const handleRes = await meta.uploadTemplateMedia(req.file.buffer, {
        fileType: req.file.mimetype,
      });
      headerHandle = handleRes?.h || '';
      if (!headerHandle) {
        return res.status(502).json({ error: 'Failed to obtain Meta media handle.' });
      }
    }

    // Save draft locally first
    const doc = await Campaign.create({
      name,
      language,
      category,
      headerType,
      headerText,
      headerMediaUrl,
      headerMediaPublicId,
      headerHandle,
      bodyText,
      footerText,
      buttons: parseButtons(buttons),
      status: 'DRAFT',
    });

    // 3. Send to Meta
    try {
      const components = buildComponents(doc);
      const result = await meta.createTemplate({
        name: doc.name,
        language: doc.language,
        category: doc.category,
        components,
      });
      doc.metaTemplateId = result.id;
      doc.status = String(result.status || 'PENDING').toUpperCase();
      doc.lastSyncedAt = new Date();
      await doc.save();
    } catch (err) {
      console.error('[campaigns] createTemplate failed:', err.response?.data || err.message);
      doc.status = 'REJECTED';
      doc.rejectionReason =
        err.response?.data?.error?.error_user_msg ||
        err.response?.data?.error?.message ||
        err.message;
      await doc.save();
    }

    res.json({ campaign: doc });
  } catch (err) {
    console.error('[campaigns] create error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Refresh template status from Meta. Returns the updated record(s). */
router.post('/sync', auth, async (_req, res) => {
  try {
    const list = await meta.listTemplates();
    const items = list.data || [];
    const byName = new Map(items.map((t) => [t.name, t]));
    const docs = await Campaign.find();
    let updated = 0;
    for (const c of docs) {
      const t = byName.get(c.name);
      if (!t) continue;
      const newStatus = String(t.status || 'PENDING').toUpperCase();
      if (c.status !== newStatus || !c.metaTemplateId) {
        c.metaTemplateId = t.id;
        c.status = newStatus;
        c.rejectionReason = t.rejected_reason || '';
        c.lastSyncedAt = new Date();
        await c.save();
        updated++;
      }
    }
    res.json({ ok: true, updated, total: docs.length });
  } catch (err) {
    console.error('[campaigns] sync failed:', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

/** Send the approved template to all (or filtered) Members. */
router.post('/:id/send', auth, async (req, res) => {
  try {
    const c = await Campaign.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'not found' });
    if (c.status !== 'APPROVED') return res.status(400).json({ error: `Template not approved (${c.status}).` });

    const members = await Member.find({}).lean();
    const recipients = members.map((m) => m.phone).filter(Boolean);

    let success = 0;
    let failed = 0;

    for (const phone of recipients) {
      try {
        await meta.sendTemplate(phone, {
          name: c.name,
          language: c.language,
          components: buildSendComponents(c),
        });
        success++;
      } catch (err) {
        failed++;
        console.warn('[campaigns] send to', phone, 'failed:', err.response?.data || err.message);
      }
    }

    c.sends.push({ sentAt: new Date(), total: recipients.length, success, failed });
    await c.save();

    res.json({ ok: true, total: recipients.length, success, failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const c = await Campaign.findById(req.params.id);
    if (!c) return res.json({ ok: true });

    // Try to delete from Meta first (best effort)
    try {
      await meta.deleteTemplate({ name: c.name, hsmId: c.metaTemplateId });
    } catch (err) {
      console.warn('[campaigns] meta delete failed:', err.response?.data || err.message);
    }
    if (c.headerMediaPublicId) {
      await destroy(c.headerMediaPublicId, { resource_type: 'image' }).catch(() => {});
    }
    await c.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
