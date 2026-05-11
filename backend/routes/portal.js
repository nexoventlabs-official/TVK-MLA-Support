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
const { sendOtpText, sendOtpTemplate, ensureOtpTemplate } = require('../services/metaCloud');
const { SERVICES } = require('../services/serviceCatalog');
const { getMap: getFlowImageMap } = require('../services/flowImages');

const router = express.Router();

/* ─── helpers ─────────────────────────────────────────────────────── */

const JWT_SECRET = () => process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || 'dev-portal-secret';
const OTP_TTL_MS = 5 * 60 * 1000;        // 5 minutes
const MAX_OTP_ATTEMPTS = 5;
// WhatsApp's Customer Service Window: free-form messages are billable-free
// for 24 hours after the user's last inbound message. We give ourselves a
// small safety margin (23 h) so a code sent right at the edge doesn't get
// rejected mid-flight by Meta.
const WA_FREE_WINDOW_MS = 23 * 60 * 60 * 1000;

// Once we successfully send through the template we cache that fact in
// memory — listing templates on every cold-start OTP is wasteful and Meta
// rate-limits the messaging endpoint based on overall quota.
let otpTemplateConfirmed = false;

/**
 * Returns true iff the request carries the configured admin token. Used by
 * the diagnostic endpoints + the "echo OTP code in response" override on
 * /auth/send-otp so we can test the rest of the pipeline (verify, register)
 * even if the WhatsApp message itself isn't reaching the recipient phone.
 *
 * Disabled by default: PORTAL_ADMIN_TOKEN must be set to a non-empty string
 * AND the request must include a matching `x-portal-admin-token` header.
 */
function hasAdminToken(req) {
  const expected = process.env.PORTAL_ADMIN_TOKEN;
  if (!expected) return false;
  const got = req.headers['x-portal-admin-token'];
  return typeof got === 'string' && got.length > 0 && got === expected;
}

/**
 * Send the AUTHENTICATION template, auto-creating it on Meta the first time
 * we see a 132001 ("template name does not exist") error. AUTHENTICATION
 * templates have a fixed structure that Meta auto-approves the moment we
 * register them, so the retry usually succeeds within the same request.
 *
 * If the freshly created template comes back PENDING (rare for AUTH), we
 * surface a helpful error rather than silently failing.
 */
async function sendOtpTemplateWithSelfHeal(e164, code) {
  if (otpTemplateConfirmed) return sendOtpTemplate(e164, code);
  try {
    const data = await sendOtpTemplate(e164, code);
    otpTemplateConfirmed = true;
    return data;
  } catch (err) {
    const metaCode = err.response?.data?.error?.code;
    // 132001 = template name does not exist; 132000 = invalid name.
    if (metaCode !== 132001 && metaCode !== 132000) throw err;

    console.log('[portal] OTP template missing — auto-creating on Meta...');
    const ensured = await ensureOtpTemplate({}); // uses META_OTP_TEMPLATE_NAME / _LANGUAGE env
    console.log('[portal] ensureOtpTemplate:', ensured);

    if (ensured.status && ensured.status !== 'APPROVED') {
      const error = new Error(
        `OTP template just created on Meta (status=${ensured.status}). Approval is normally instant — please retry sending in a few seconds.`
      );
      error.code = 'TEMPLATE_PENDING';
      throw error;
    }

    const data = await sendOtpTemplate(e164, code);
    otpTemplateConfirmed = true;
    return data;
  }
}

/**
 * Pick the most recent "user messaged us" timestamp we know about. Prefers
 * the dedicated `lastInboundAt` field, but falls back to `lastSeenAt` for
 * Members that pre-date the lastInboundAt rollout. Surfaced in logs so we
 * can still tell whether the recipient had an open 24h window at send time
 * — useful for diagnosing delivery issues — even though we no longer use
 * the value to choose between text and template.
 */
function inboundActivityAt(member) {
  if (!member) return null;
  if (member.lastInboundAt) return new Date(member.lastInboundAt);
  if ((member.messageCount || 0) > 0 && member.lastSeenAt) return new Date(member.lastSeenAt);
  return null;
}

/**
 * Choose the cheapest reliable channel and send the OTP.
 *
 * - In-window users (lastInboundAt within 23 h) get a free-form text
 *   message. Free for the business since it's part of the open
 *   customer-service conversation. No native Copy code button — the OS's
 *   long-press-to-copy gesture on the bold code is the workaround.
 * - Out-of-window users get the AUTHENTICATION template (matches temp.png:
 *   "{{1}} is your verification code. For your security, do not share this
 *   code. This code expires in 5 minutes." with a real Copy code button).
 *
 * `force` (admin-gated) is the testing escape hatch — pass 'text' or
 * 'template' to skip the auto-decision and exercise that channel directly.
 *
 * Returns `{ channel, meta, windowOpen, inboundAt }` so the route can log
 * Meta's accepted message id and the dispatcher's view of the recipient.
 */
async function dispatchOtp(member, e164, code, { force } = {}) {
  const inboundAt = inboundActivityAt(member);
  const windowOpen = !!inboundAt && Date.now() - inboundAt.getTime() < WA_FREE_WINDOW_MS;

  let channel;
  if (force === 'text' || force === 'template') {
    channel = force;
  } else {
    channel = windowOpen ? 'text' : 'template';
  }

  if (channel === 'text') {
    const meta = await sendOtpText(e164, code);
    return { channel: 'text', meta, windowOpen, inboundAt };
  }
  const meta = await sendOtpTemplateWithSelfHeal(e164, code);
  return { channel: 'template', meta, windowOpen, inboundAt };
}

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

    // Admin-only channel override. Letting end-users force the paid template
    // path would be an abuse vector, so we ignore the field unless the caller
    // proves they hold the admin token.
    const force =
      hasAdminToken(req) && (req.body?.force === 'text' || req.body?.force === 'template')
        ? req.body.force
        : null;

    let channel = 'none';
    let metaResp = null;
    let dispatchInfo = null;
    try {
      const out = await dispatchOtp(existing, e164, code, { force });
      channel = out.channel;
      metaResp = out.meta;
      dispatchInfo = out;

      // Render-visible record of what Meta accepted so we can correlate
      // delivery-webhook events later. wa_id should equal the input phone
      // for valid WhatsApp users; if it's missing, the recipient isn't on
      // WhatsApp and that explains a "200 OK but no message arrived".
      console.log('[portal] OTP dispatched:', {
        phone: e164,
        purpose: mode,
        channel,
        forced: !!force,
        windowOpen: out.windowOpen,
        inboundAt: out.inboundAt,
        messageId: metaResp?.messages?.[0]?.id || null,
        waId: metaResp?.contacts?.[0]?.wa_id || null,
        recipientOnWhatsApp: !!metaResp?.contacts?.[0]?.wa_id,
      });
    } catch (err) {
      const meta = err.response?.data?.error;
      const inboundAt = inboundActivityAt(existing);
      const windowOpen = !!inboundAt && Date.now() - inboundAt.getTime() < WA_FREE_WINDOW_MS;
      console.error('[portal] OTP dispatch failed:', {
        phone: e164,
        attempted: force || (windowOpen ? 'text' : 'template'),
        forced: !!force,
        windowOpen,
        inboundAt,
        metaCode: meta?.code,
        metaMessage: meta?.message,
        details: meta?.error_data?.details,
      });

      if (process.env.NODE_ENV === 'production') {
        // Surface a user-actionable message rather than a generic 502.
        // TEMPLATE_PENDING comes from our self-heal path: template was just
        // created on Meta and is awaiting (usually instant) approval.
        if (err.code === 'TEMPLATE_PENDING') {
          return res.status(503).json({
            error: 'OTP service is finishing setup. Please retry in a few seconds.',
          });
        }
        // 131047 = re-engagement required (24h window closed AND template missing).
        if (meta?.code === 131047) {
          return res.status(502).json({
            error: 'WhatsApp session has expired. Please send any message to our WhatsApp first, then retry.',
          });
        }
        return res.status(502).json({ error: 'Could not deliver OTP. Try again in a moment.' });
      }
      // Dev fallback so you can test without Meta credentials configured.
      console.warn(`[portal] DEV ONLY — OTP for ${e164}: ${code}`);
    }

    const response = {
      ok: true,
      ttlSeconds: OTP_TTL_MS / 1000,
      channel,
      messageId: metaResp?.messages?.[0]?.id || null,
      recipientOnWhatsApp: metaResp?.contacts?.[0]?.wa_id ? true : false,
    };
    // Admin override: if the caller proves they hold the admin token, echo
    // the raw OTP code back so they can verify the rest of the flow without
    // depending on WhatsApp delivery actually working. Also include the
    // dispatcher's view of the window state so the operator can confirm the
    // 24h-window detection is working as intended. NEVER returned without
    // the header.
    if (hasAdminToken(req)) {
      response._devCode = code;
      response._dispatch = {
        forced: !!force,
        windowOpen: dispatchInfo?.windowOpen ?? null,
        inboundAt: dispatchInfo?.inboundAt ?? null,
      };
    }

    res.json(response);
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

/**
 * GET /auth/diag — operator diagnostics for the OTP pipeline.
 *
 * Gated by the `x-portal-admin-token` header matching `PORTAL_ADMIN_TOKEN`,
 * so it's safe to deploy publicly. Returns enough info to diagnose
 * "API said success but no WhatsApp message arrived" without giving any
 * attacker something to brute-force:
 *   - which Meta IDs the backend is using (so you can confirm they match
 *     the WABA you actually own)
 *   - the OTP template's name + status as Meta sees it
 *   - the last 10 OTP attempts for the optional ?phone= filter, with the
 *     plaintext code redacted (we only ever store the hash anyway)
 *
 * Optional query: ?phone=8106811285  (any of the formats normalisePhone
 * accepts) → restricts the OtpCode listing to that recipient.
 */
router.get('/auth/diag', async (req, res) => {
  if (!hasAdminToken(req)) return res.status(404).json({ error: 'Not found' });

  const out = {
    config: {
      graphVersion: process.env.META_GRAPH_VERSION || null,
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || null,
      wabaId: process.env.META_WABA_ID || null,
      hasAccessToken: !!process.env.META_ACCESS_TOKEN,
      otpTemplateName: process.env.META_OTP_TEMPLATE_NAME || 'tvk_portal_otp',
      otpTemplateLanguage: process.env.META_OTP_TEMPLATE_LANGUAGE || 'en_US',
      nodeEnv: process.env.NODE_ENV || 'development',
      otpTemplateConfirmed,
    },
    templates: null,
    member: null,
    otps: [],
  };

  // Templates — list and pull out the OTP one for quick scanning.
  try {
    const list = await require('../services/metaCloud').listTemplates();
    out.templates = (list?.data || []).map((t) => ({
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      rejected_reason: t.rejected_reason,
    }));
  } catch (err) {
    out.templates = { error: err.response?.data?.error || err.message };
  }

  // Per-phone slice (optional).
  if (req.query.phone) {
    const e164 = normalisePhone(req.query.phone);
    if (e164) {
      const m = await Member.findOne({ phone: e164 }).lean();
      out.member = m ? {
        phone: m.phone,
        name: m.name || m.profileName || '',
        isRegistered: !!m.isRegistered,
        messageCount: m.messageCount || 0,
        lastInboundAt: m.lastInboundAt || null,
        lastSeenAt: m.lastSeenAt || null,
      } : { exists: false, phone: e164 };

      out.otps = await OtpCode.find({ phone: e164 })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('phone purpose attempts consumed createdAt expiresAt')
        .lean();
    } else {
      out.member = { error: 'phone could not be normalised' };
    }
  }

  res.json(out);
});

/* ─── public catalog endpoints ────────────────────────────────────── */

/**
 * GET /services — service catalog with admin-uploaded icons & banners.
 *
 * Returns the same SERVICES list the WhatsApp flow renders, with each iconKey
 * / bannerKey resolved to a Cloudinary URL via the FlowImage collection. The
 * portal therefore stays in sync with the bot: whatever the admin uploads in
 * the "Flow Images" page shows up on both surfaces automatically.
 *
 * Public — no auth needed (citizen sees this before login).
 */
router.get('/services', async (_req, res) => {
  try {
    const keys = [];
    for (const s of SERVICES) {
      if (s.iconKey) keys.push(s.iconKey);
      if (s.bannerKey) keys.push(s.bannerKey);
      for (const o of s.options) {
        if (o.iconKey) keys.push(o.iconKey);
      }
    }
    const urlMap = await getFlowImageMap(keys);

    const services = SERVICES.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      iconUrl: urlMap[s.iconKey] || '',
      bannerUrl: urlMap[s.bannerKey] || '',
      options: s.options.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        iconUrl: urlMap[o.iconKey] || '',
      })),
    }));

    // Cheap to recompute but icons change rarely — let the browser hold the
    // payload for a minute. The admin's upload flow already busts the
    // in-memory FlowImage cache, so the worst-case staleness is 60 s.
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ services });
  } catch (err) {
    console.error('[portal] services error:', err);
    res.status(500).json({ error: err.message });
  }
});

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
