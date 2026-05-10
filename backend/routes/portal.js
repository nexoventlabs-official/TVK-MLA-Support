/**
 * Public router for the citizen web portal (Mylapore).
 *
 * Mounted at /api/portal. Wholly additive — does not touch the WhatsApp bot
 * code paths, the admin auth, or any existing route. Shares the Member and
 * ServiceRequest collections with the bot, keyed by phone, so a user who
 * registers on the web can later message the bot and be recognised, and
 * vice-versa.
 *
 * Endpoints
 * ─────────
 *   POST /auth/send-otp        { phone, mode: 'login'|'register' }
 *   POST /auth/verify-otp      { phone, otp }                       → JWT (login)
 *   POST /auth/register        { phone, otp, name, dob, epic? }     → JWT
 *   GET  /auth/me                                                    → user profile
 *
 *   GET  /services                                                   → catalog
 *   GET  /events                                                     → upcoming
 *   GET  /stats                                                      → public counters
 *
 *   GET  /grievances                                                 → mine
 *   POST /grievances           multipart (image optional)            → create
 *   GET  /grievances/:ticketId                                       → mine, by id
 *
 * Auth
 * ────
 *   Bearer JWT signed with PORTAL_JWT_SECRET, 30-day TTL.
 *   Payload: { phone, memberId }.
 */

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');
const Event = require('../models/Event');
const OtpCode = require('../models/OtpCode');

const upload = require('../middleware/upload');
const { uploadBuffer } = require('../services/cloudinary');
const { generateTicketId } = require('../services/ticketing');
const { sendOtpTemplate } = require('../services/metaCloud');

const router = express.Router();

/* ─── helpers ─────────────────────────────────────────────────────── */

const JWT_SECRET = () => process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || 'dev-portal-secret';
const OTP_TTL_MS = 5 * 60 * 1000;        // 5 minutes
const MAX_OTP_ATTEMPTS = 5;

/**
 * Normalise an Indian phone number to E.164 digits (no '+'), e.g. "919876543210".
 * Returns null on anything that can't be normalised.
 */
function normalisePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(1);
  return null;
}

function signToken(member) {
  return jwt.sign(
    { phone: member.phone, memberId: member._id.toString() },
    JWT_SECRET(),
    { expiresIn: '30d' }
  );
}

function publicMember(m) {
  if (!m) return null;
  return {
    id: m._id,
    phone: m.phone,
    name: m.name || m.profileName || '',
    email: m.email || '',
    dob: m.dob || null,
    age: m.age || null,
    epic: m.epicNo || '',
    isRegistered: !!m.isRegistered,
    registrationType: m.registrationType || '',
    registeredAt: m.registeredAt || null,
  };
}

/** Bearer-token guard. Attaches `req.portalUser` (a Member doc) on success. */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(token, JWT_SECRET());
    const member = await Member.findById(payload.memberId);
    if (!member) return res.status(401).json({ error: 'Session expired, please log in again' });
    req.portalUser = member;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/* ─── auth ────────────────────────────────────────────────────────── */

/**
 * POST /auth/send-otp
 *
 * For login: requires Member to already exist with isRegistered=true.
 * For register: refuses if Member already isRegistered.
 *
 * Always invalidates older OTP codes for the same phone+purpose before issuing
 * a fresh one, so a user can request a new code if WhatsApp delivery is slow.
 */
router.post('/auth/send-otp', async (req, res) => {
  try {
    const { phone, mode } = req.body || {};
    if (!['login', 'register'].includes(mode)) {
      return res.status(400).json({ error: 'mode must be "login" or "register"' });
    }
    const e164 = normalisePhone(phone);
    if (!e164) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });

    const existing = await Member.findOne({ phone: e164 });
    if (mode === 'login' && (!existing || !existing.isRegistered)) {
      return res.status(404).json({ error: 'This number is not registered yet. Please sign up.' });
    }
    if (mode === 'register' && existing && existing.isRegistered) {
      return res.status(409).json({ error: 'This number is already registered. Please log in.' });
    }

    // Invalidate any prior unconsumed codes for this phone+purpose.
    await OtpCode.deleteMany({ phone: e164, purpose: mode, consumed: false });

    const code = OtpCode.generateCode();
    const salt = crypto.randomBytes(8).toString('hex');
    await OtpCode.create({
      phone: e164,
      purpose: mode,
      salt,
      codeHash: OtpCode.hashCode(code, salt),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    try {
      await sendOtpTemplate(e164, code);
    } catch (err) {
      console.error('[portal] sendOtpTemplate failed:', err.response?.data || err.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(502).json({ error: 'Could not deliver OTP. Try again in a moment.' });
      }
      // Dev fallback so you can test without Meta credentials configured.
      console.warn(`[portal] DEV ONLY — OTP for ${e164}: ${code}`);
    }

    res.json({ ok: true, ttlSeconds: OTP_TTL_MS / 1000 });
  } catch (err) {
    console.error('[portal] send-otp error:', err);
    res.status(500).json({ error: 'Could not send OTP' });
  }
});

/**
 * POST /auth/verify-otp  — login flow
 *
 * Caller already has a registered Member; this just validates the OTP and
 * returns a session JWT.
 */
router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body || {};
    const e164 = normalisePhone(phone);
    if (!e164 || !otp) return res.status(400).json({ error: 'phone and otp are required' });

    const record = await OtpCode.findOne({ phone: e164, purpose: 'login', consumed: false })
      .sort({ createdAt: -1 });
    if (!record) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many attempts. Please request a fresh OTP.' });
    }

    if (!record.matches(String(otp))) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ error: 'Incorrect OTP' });
    }

    record.consumed = true;
    await record.save();

    const member = await Member.findOne({ phone: e164 });
    if (!member || !member.isRegistered) {
      return res.status(404).json({ error: 'Account not found. Please register.' });
    }
    member.lastSeenAt = new Date();
    await member.save();

    res.json({ token: signToken(member), user: publicMember(member) });
  } catch (err) {
    console.error('[portal] verify-otp error:', err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

/**
 * POST /auth/register
 *
 * One-shot registration: verifies the OTP issued for purpose='register' and
 * upserts the Member document. If a Member already exists for this phone (e.g.
 * because the user previously messaged the WhatsApp bot but never completed
 * registration), we keep their messageCount / firstSeenAt and just fill in the
 * profile fields — so the WhatsApp identity and the web identity are the same
 * person.
 *
 * `epic` is optional. When omitted we mark registrationType='manual'.
 */
router.post('/auth/register', async (req, res) => {
  try {
    const { phone, otp, name, dob, epic } = req.body || {};
    const e164 = normalisePhone(phone);
    if (!e164) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    if (!otp) return res.status(400).json({ error: 'OTP is required' });
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Full name is required' });

    const dobDate = dob ? new Date(dob) : null;
    if (dob && (Number.isNaN(dobDate?.getTime?.()) || dobDate > new Date())) {
      return res.status(400).json({ error: 'Enter a valid date of birth' });
    }

    const epicTrim = epic ? String(epic).trim().toUpperCase() : '';
    if (epicTrim && !/^[A-Z]{2,3}[0-9]{6,7}$/.test(epicTrim)) {
      return res.status(400).json({ error: 'EPIC number looks invalid (expected e.g. TNA1234567)' });
    }

    const record = await OtpCode.findOne({ phone: e164, purpose: 'register', consumed: false })
      .sort({ createdAt: -1 });
    if (!record) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many attempts. Please request a fresh OTP.' });
    }
    if (!record.matches(String(otp))) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ error: 'Incorrect OTP' });
    }

    // Reject double-registration after the OTP itself was valid, so the user
    // sees a clear message rather than a silent overwrite.
    let member = await Member.findOne({ phone: e164 });
    if (member && member.isRegistered) {
      return res.status(409).json({ error: 'This number is already registered. Please log in.' });
    }

    if (!member) {
      member = new Member({ phone: e164, firstSeenAt: new Date() });
    }
    member.name = String(name).trim();
    if (dobDate) member.dob = dobDate;
    if (epicTrim) member.epicNo = epicTrim;
    member.isRegistered = true;
    member.registrationType = epicTrim ? 'epic' : 'manual';
    member.registeredAt = new Date();
    member.lastSeenAt = new Date();
    await member.save();

    record.consumed = true;
    await record.save();

    res.json({ token: signToken(member), user: publicMember(member) });
  } catch (err) {
    console.error('[portal] register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/** GET /auth/me — return the current portal user. */
router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicMember(req.portalUser) });
});

/* ─── public catalog endpoints ────────────────────────────────────── */

/** GET /events — same shape as the WhatsApp flow's upcoming-events feed. */
router.get('/events', async (_req, res) => {
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

/**
 * GET /stats — aggregate counters for the public landing page.
 * Cheap aggregations; safe to hit on every page load.
 */
router.get('/stats', async (_req, res) => {
  try {
    const [totalReceived, totalResolved, members] = await Promise.all([
      ServiceRequest.estimatedDocumentCount(),
      ServiceRequest.countDocuments({ status: 'completed' }),
      Member.countDocuments({ isRegistered: true }),
    ]);

    // Average resolution time (days) over the last 90 days of completed requests.
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const recent = await ServiceRequest.find({ status: 'completed', updatedAt: { $gte: since } })
      .select('createdAt updatedAt')
      .lean();
    let avgDays = 7;
    if (recent.length) {
      const total = recent.reduce((acc, r) => acc + (r.updatedAt - r.createdAt), 0);
      avgDays = Math.max(1, Math.round(total / recent.length / (24 * 3600 * 1000)));
    }

    res.json({
      success: true,
      stats: {
        totalReceived,
        totalResolved,
        avgResponseTime: `${avgDays} day${avgDays === 1 ? '' : 's'}`,
        satisfaction: `${members.toLocaleString('en-IN')}+`,
      },
    });
  } catch (err) {
    console.error('[portal] stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ─── grievances ──────────────────────────────────────────────────── */

/**
 * GET /grievances — the current user's tickets, newest first.
 * Includes the WhatsApp-bot-created tickets too because both flows write to
 * the same ServiceRequest collection keyed by phone.
 */
router.get('/grievances', requireAuth, async (req, res) => {
  try {
    const items = await ServiceRequest.find({ phone: req.portalUser.phone })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ requests: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /grievances/:ticketId — single ticket the caller owns. */
router.get('/grievances/:ticketId', requireAuth, async (req, res) => {
  try {
    const item = await ServiceRequest.findOne({
      ticketId: req.params.ticketId,
      phone: req.portalUser.phone,
    }).lean();
    if (!item) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ request: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /grievances — create a ticket from the web portal.
 * Multipart: optional `image` field. All other fields are strings on the body.
 *
 * Required: serviceId, optionId, description.
 * Service / option titles are echoed from the client so we don't need a server-
 * side catalog (the same approach the WhatsApp flow takes).
 */
router.post('/grievances', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const {
      serviceId, serviceTitle = '',
      optionId, optionTitle = '',
      description = '',
      location = '',
      lat, lng,
    } = req.body || {};

    if (!serviceId || !optionId) {
      return res.status(400).json({ error: 'serviceId and optionId are required' });
    }
    if (!String(description).trim()) {
      return res.status(400).json({ error: 'Please describe the issue' });
    }

    let mediaUrls = [];
    if (req.file) {
      const result = await uploadBuffer(req.file.buffer, { folder: 'tvk/grievances' });
      mediaUrls = [result.secure_url];
    }

    const ticketId = await generateTicketId();
    const geo = lat && lng ? {
      latitude: Number(lat),
      longitude: Number(lng),
      name: '',
      address: String(location || ''),
    } : null;

    const doc = await ServiceRequest.create({
      ticketId,
      phone: req.portalUser.phone,
      name: req.portalUser.name || req.portalUser.profileName || '',
      serviceId: String(serviceId),
      serviceTitle: String(serviceTitle),
      optionId: String(optionId),
      optionTitle: String(optionTitle),
      description: String(description).trim().slice(0, 2000),
      location: String(location || ''),
      geo,
      mediaUrls,
      status: 'pending',
    });

    // Bump per-member counter so admin dashboards stay accurate across both
    // the WhatsApp flow and the web portal.
    await Member.updateOne({ _id: req.portalUser._id }, { $inc: { requestCount: 1 } });

    res.json({ ok: true, grievanceId: doc.ticketId, request: doc });
  } catch (err) {
    console.error('[portal] grievance create error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit grievance' });
  }
});

module.exports = router;
