/**
 * WhatsApp Flow Endpoint — RSA + AES-128-GCM encrypted exchange.
 *
 * Receives INIT / data_exchange / BACK / ping actions from Meta and returns the
 * next screen with dynamic content (banners + service / option icons as base64).
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const flowImages = require('../services/flowImages');
const { urlToBase64 } = require('../services/imageBase64');
const { SERVICES, getServiceById, getOption } = require('../services/serviceCatalog');
const { findVoterByEpic } = require('../services/voterDb');
const { getAction, needsDetailsForm } = require('../services/issueActions');
const { generateTicketId } = require('../services/ticketing');
const { MAIN_MENU_KEYS, SOCIAL_KEYS } = require('../services/menuImageKeys');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');
const Event = require('../models/Event');

const router = express.Router();

const LOG_PATH = path.join(__dirname, '..', 'flow-debug.log');
function dbg(...args) {
  const line =
    `[${new Date().toISOString()}] ` +
    args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ') +
    '\n';
  try {
    fs.appendFileSync(LOG_PATH, line);
  } catch {}
  console.log('[FlowEndpoint]', ...args);
}

/* ───────── Encryption helpers ───────── */

const FLOW_PRIVATE_KEY_RAW = process.env.FLOW_PRIVATE_KEY || '';
const FLOW_PRIVATE_KEY = FLOW_PRIVATE_KEY_RAW.split('\\n').join('\n');

function decryptRequest(body) {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body || {};

  if (!FLOW_PRIVATE_KEY) {
    return { decryptedBody: body, aesKeyBuffer: null, ivBuffer: null };
  }
  if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
    throw new Error('Missing encryption fields');
  }

  const privateKey = crypto.createPrivateKey({ key: FLOW_PRIVATE_KEY, format: 'pem' });
  const aesKeyBuffer = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encrypted_aes_key, 'base64')
  );

  const ivBuffer = Buffer.from(initial_vector, 'base64');
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  const TAG_LEN = 16;
  const authTag = flowDataBuffer.slice(-TAG_LEN);
  const ciphertext = flowDataBuffer.slice(0, -TAG_LEN);

  const decipher = crypto.createDecipheriv('aes-128-gcm', aesKeyBuffer, ivBuffer);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const decryptedBody = JSON.parse(plain.toString('utf-8'));

  return { decryptedBody, aesKeyBuffer, ivBuffer };
}

function encryptResponse(obj, aesKeyBuffer, ivBuffer) {
  if (!aesKeyBuffer || !ivBuffer) return obj;

  const flipped = Buffer.alloc(ivBuffer.length);
  for (let i = 0; i < ivBuffer.length; i++) flipped[i] = ~ivBuffer[i] & 0xff;

  const cipher = crypto.createCipheriv('aes-128-gcm', aesKeyBuffer, flipped);
  const out = Buffer.concat([
    cipher.update(JSON.stringify(obj), 'utf-8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return out.toString('base64');
}

/* ───────── Image cache (10 min, manually invalidated on admin upload) ───────── */

let imgCache = { data: null, ts: 0 };
const IMG_TTL = 10 * 60 * 1000;

function clearImageCache() {
  imgCache = { data: null, ts: 0 };
}

async function loadAllImages() {
  if (imgCache.data && Date.now() - imgCache.ts < IMG_TTL) return imgCache.data;

  const keys = ['flow_welcome_banner', 'header_events', 'header_social'];
  // Top-level main-menu icons (Your Requests, Events, Raise Issue, Contact MLA, Social, Helplines)
  for (const m of MAIN_MENU_KEYS) keys.push(m.key);
  // Social platform icons for SOCIAL_SELECT
  for (const s of SOCIAL_KEYS) keys.push(s.key);
  for (const s of SERVICES) {
    keys.push(s.iconKey, s.bannerKey);
    for (const o of s.options) keys.push(o.iconKey);
  }
  const map = await flowImages.getMap(keys);

  const entries = await Promise.all(
    keys.map(async (k) => {
      const url = map[k];
      if (!url) return [k, ''];
      const isIcon = k.startsWith('icon_');
      // Budget per Flow response (Meta encrypted payload limit ≈ 250 KB):
      //   • Banner: 1600×200 q82 JPG → ~100 KB
      //   • Icons:  200×200  q80 JPG → ~8 KB each
      // With this budget a SERVICE_SELECT screen with 15+ services still
      // fits comfortably (100 + 15×8 ≈ 220 KB), leaving room for new
      // services to be added without hitting the cap.
      const opts = isIcon
        ? { width: 200, height: 200, crop: 'fill', quality: 80, format: 'jpg' }
        : { width: 1600, height: 200, crop: 'fill', quality: 82, format: 'jpg' };
      const b64 = await urlToBase64(url, opts);
      return [k, b64];
    })
  );
  const data = Object.fromEntries(entries);
  imgCache = { data, ts: Date.now() };
  return data;
}

/* ───────── Helpers ───────── */

function withImage(item, b64) {
  if (b64) item.image = b64;
  return item;
}

function phoneFromToken(token) {
  if (!token) return '';
  return String(token).replace(/^welcome_/, '').replace(/^reg_/, '').replace(/\D/g, '');
}

function isRegistrationToken(token) {
  return typeof token === 'string' && token.startsWith('reg_');
}

function isRegistrationScreen(screen) {
  return typeof screen === 'string' && screen.startsWith('REG_');
}

/**
 * Parse a DOB coming from the Flow DatePicker (epoch ms as string) or a
 * YYYY-MM-DD string and return a Date or null.
 */
function parseDob(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const d = new Date(parseInt(s, 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDobLabel(d) {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function buildServiceList(images) {
  return SERVICES.map((s) =>
    withImage(
      { id: s.id, title: s.title, description: s.description },
      images[s.iconKey]
    )
  );
}

function buildOptionList(serviceId, images) {
  const s = getServiceById(serviceId);
  if (!s) return [];
  return s.options.map((o) =>
    withImage(
      { id: o.id, title: o.title, description: o.description },
      images[o.iconKey]
    )
  );
}

/* ───────── Handler ───────── */

router.post('/', async (req, res) => {
  let aesKeyBuffer, ivBuffer, decryptedBody;
  try {
    ({ decryptedBody, aesKeyBuffer, ivBuffer } = decryptRequest(req.body));
  } catch (err) {
    console.error('[FlowEndpoint] decrypt failed:', err.message);
    return res.status(421).send();
  }

  const { action, screen, data, flow_token, version } = decryptedBody || {};
  dbg('REQUEST', { action, screen, flow_token, version, data });

  if (action === 'ping') {
    return sendResponse(res, { data: { status: 'active' } }, aesKeyBuffer, ivBuffer);
  }
  if (data?.error) {
    dbg('CLIENT_ERROR', data);
    return sendResponse(res, { data: { acknowledged: true } }, aesKeyBuffer, ivBuffer);
  }

  try {
    let response;
    const isReg = isRegistrationToken(flow_token) || isRegistrationScreen(screen);
    if (action === 'INIT' || action === 'BACK') {
      response = isReg ? await handleRegInit(flow_token) : await handleInit(flow_token);
    } else if (action === 'data_exchange') {
      response = isReg
        ? await handleRegDataExchange({ screen, data, flow_token })
        : await handleDataExchange({ screen, data, flow_token });
    } else {
      response = isReg ? await handleRegInit(flow_token) : await handleInit(flow_token);
    }
    dbg('RESPONSE', { screen: response?.screen, dataKeys: Object.keys(response?.data || {}) });
    return sendResponse(res, response, aesKeyBuffer, ivBuffer);
  } catch (err) {
    dbg('HANDLER_ERROR', { message: err.message, stack: err.stack });
    const isReg = isRegistrationToken(flow_token) || isRegistrationScreen(screen);
    // The fallback screen MUST exist in the active flow's routing_model,
    // otherwise the WhatsApp client silently drops the response and the
    // Register / Continue buttons appear "dead" to the user.
    const fallback = isReg
      ? {
          screen: 'REG_DONE',
          data: {
            info_title: '⚠️ Something went wrong',
            info_body:
              'We could not complete your registration right now. Please type *hi* and try again in a moment.',
          },
        }
      : infoScreen({
          title: 'Something went wrong',
          body: 'Please try again later.',
        });
    return sendResponse(res, fallback, aesKeyBuffer, ivBuffer);
  }
});

function sendResponse(res, obj, aesKeyBuffer, ivBuffer) {
  const payload = { version: '3.0', ...obj };
  const out = encryptResponse(payload, aesKeyBuffer, ivBuffer);
  if (typeof out === 'string') {
    res.set('Content-Type', 'text/plain');
    return res.send(out);
  }
  return res.json(out);
}

/* ───────── INIT ───────── */
async function handleInit(_flow_token) {
  const images = await loadAllImages();
  return {
    screen: 'MAIN_MENU',
    data: {
      welcome_banner: images.flow_welcome_banner || '',
      has_welcome_banner: !!images.flow_welcome_banner,
      main_options: buildMainMenu(images),
    },
  };
}

/* ───────── MAIN_MENU helpers ───────── */
/**
 * Build a SUCCESS response for data_exchange. WhatsApp closes the flow
 * immediately (no "Tap Close" terminal screen) and sends the `params` back
 * to the webhook in nfm_reply.response_json. Use this for MAIN_MENU picks
 * that should close the flow and trigger a follow-up message directly.
 */
function successScreen(params = {}) {
  return {
    screen: 'SUCCESS',
    data: {
      extension_message_response: {
        params,
      },
    },
  };
}

function buildSocialList(images) {
  return [
    { id: 'facebook',  iconKey: 'icon_social_facebook',  title: 'Facebook',      description: 'Official Facebook page' },
    { id: 'instagram', iconKey: 'icon_social_instagram', title: 'Instagram',     description: 'Official Instagram handle' },
    { id: 'youtube',   iconKey: 'icon_social_youtube',   title: 'YouTube',       description: 'Official YouTube channel' },
    { id: 'twitter',   iconKey: 'icon_social_twitter',   title: 'X (Twitter)',   description: 'Official X handle' },
  ].map((p) =>
    withImage({ id: p.id, title: p.title, description: p.description }, images[p.iconKey])
  );
}

function buildMainMenu(images) {
  const tiles = [
    { id: 'my_requests',  iconKey: 'icon_main_my_requests', title: 'Your Requests',     description: 'Track your tickets' },
    { id: 'events',       iconKey: 'icon_main_events',      title: 'Upcoming Events',   description: 'Public events & camps' },
    { id: 'raise_issue',  iconKey: 'icon_main_raise_issue', title: 'Raise Issue',       description: '9 service categories' },
    { id: 'contact_mla',  iconKey: 'icon_main_contact_mla', title: 'Contact MLA Office', description: 'Speak to our team' },
    { id: 'social_media', iconKey: 'icon_main_social',      title: 'Social Media',      description: 'Follow us online' },
    { id: 'helplines',    iconKey: 'icon_main_helplines',   title: 'Helplines',         description: 'Emergency numbers' },
  ];
  return tiles.map((t) => withImage({ id: t.id, title: t.title, description: t.description }, images[t.iconKey]));
}

/** Build the post-action carrier the INFO terminal screen passes back via
 *  `complete` so the webhook can fire the URL / PDF / location follow-up
 *  message after the user taps Close. */
function encodePostAction(kind, payload = {}) {
  if (!kind) return { post_action: '', post_data_b64: '' };
  const json = JSON.stringify({ kind, ...payload });
  return { post_action: kind, post_data_b64: Buffer.from(json, 'utf8').toString('base64') };
}

function infoScreen({ title, body, post_action = '', post_data_b64 = '' }) {
  return {
    screen: 'INFO',
    data: {
      info_title: title,
      info_body: body,
      post_action,
      post_data_b64,
    },
  };
}

function formatEventDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function buildEventsList() {
  const events = await Event.find({ active: true, toDate: { $gte: new Date() } })
    .sort({ fromDate: 1 })
    .limit(20)
    .lean();
  return events.map((ev) => ({
    id: String(ev._id),
    title: (ev.title || '').slice(0, 30),
    description: `${formatEventDate(ev.fromDate)}${ev.location ? ' · ' + ev.location.slice(0, 24) : ''}`,
  }));
}

/** Status pill text shown to the user. */
const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  processing: 'Processing',
  completed: 'Completed ✅',
  rejected: 'Rejected',
};

async function buildMyRequestsList(phone) {
  if (!phone) return [];
  const items = await ServiceRequest.find({ phone, ticketId: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return items.map((r) => ({
    id: String(r._id),
    title: `${r.ticketId} · ${STATUS_LABEL[r.status] || r.status}`,
    description: `${r.optionTitle || ''}${r.createdAt ? ' · ' + formatEventDate(r.createdAt) : ''}`.slice(0, 60),
  }));
}

/* ───────── data_exchange ───────── */
async function handleDataExchange({ screen, data, flow_token }) {
  const phone = phoneFromToken(flow_token);
  const images = await loadAllImages();

  // ─── MAIN_MENU → branch ───
  if (screen === 'MAIN_MENU') {
    const sel = String(data?.selected_main || '').trim();
    if (sel === 'my_requests') {
      const requests = await buildMyRequestsList(phone);
      if (!requests.length) {
        return infoScreen({
          title: 'No requests yet',
          body: 'You have not raised any tickets yet. Tap *Close* and choose *Raise Issue* from the menu.',
        });
      }
      // RadioButtonsGroup needs at least one item; we already early-returned otherwise.
      return {
        screen: 'MY_REQUESTS',
        data: { requests, empty_text: '' },
      };
    }
    if (sel === 'events') {
      const events = await buildEventsList();
      if (!events.length) {
        return infoScreen({
          title: 'No upcoming events',
          body: 'There are no events scheduled right now. Please check back soon 🙏',
        });
      }
      return {
        screen: 'EVENTS',
        data: {
          events_banner: images.header_events || '',
          has_events_banner: !!images.header_events,
          events,
          empty_text: '',
        },
      };
    }
    if (sel === 'raise_issue') {
      return {
        screen: 'SERVICE_SELECT',
        data: {
          service_banner: images.flow_welcome_banner || '',
          has_service_banner: !!images.flow_welcome_banner,
          services: buildServiceList(images),
        },
      };
    }
    if (sel === 'contact_mla') {
      // Auto-close the flow; webhook dispatcher sends the MLA contact card
      // with a tap-to-call vCard and a branded image/body message.
      return successScreen({ flow_token, post_action: 'contact_mla' });
    }
    if (sel === 'helplines') {
      // Auto-close the flow; webhook dispatcher sends the helpline CTA URL.
      return successScreen({ flow_token, post_action: 'helplines' });
    }
    if (sel === 'social_media') {
      // Navigate to SOCIAL_SELECT so the user picks a platform. The
      // dispatcher sends a platform-specific CTA URL once that screen's
      // Continue closes the flow.
      return {
        screen: 'SOCIAL_SELECT',
        data: {
          social_banner: images.header_social || '',
          has_social_banner: !!images.header_social,
          social_options: buildSocialList(images),
        },
      };
    }
    return handleInit(flow_token);
  }

  // ─── MY_REQUESTS → MY_REQUEST_DETAIL ───
  if (screen === 'MY_REQUESTS') {
    const id = String(data?.selected_request || '').trim();
    let req = null;
    try {
      req = await ServiceRequest.findById(id).lean();
    } catch {
      req = null;
    }
    if (!req || (phone && req.phone !== phone)) {
      return infoScreen({
        title: 'Ticket not found',
        body: 'Please type *hi* to open the menu and try again.',
      });
    }
    return {
      screen: 'MY_REQUEST_DETAIL',
      data: {
        ticket_id: req.ticketId || '—',
        ticket_status: STATUS_LABEL[req.status] || req.status,
        ticket_meta: `${req.optionTitle || ''} · ${formatEventDate(req.createdAt)}`,
        ticket_description: req.description || '(No description provided)',
        ticket_notes: req.notes ? `Note: ${req.notes}` : '',
      },
    };
  }

  // ─── MY_REQUEST_DETAIL → INFO ───
  if (screen === 'MY_REQUEST_DETAIL') {
    return infoScreen({ title: 'Vanakkam 🙏', body: 'Type *hi* anytime to open the menu again.' });
  }

  // ─── EVENTS → EVENT_DETAILS ───
  if (screen === 'EVENTS') {
    const id = String(data?.selected_event || '').trim();
    let ev = null;
    try {
      ev = await Event.findById(id).lean();
    } catch {
      ev = null;
    }
    if (!ev) {
      return infoScreen({ title: 'Event not found', body: 'Please go back and try again.' });
    }
    let imgB64 = '';
    if (ev.image) {
      imgB64 = await urlToBase64(ev.image, { width: 1000, height: 500, format: 'jpeg' }).catch(() => '');
    }
    return {
      screen: 'EVENT_DETAILS',
      data: {
        event_image: imgB64 || '',
        has_event_image: !!imgB64,
        event_title: ev.title || '',
        event_meta: `${formatEventDate(ev.fromDate)} – ${formatEventDate(ev.toDate)}${ev.location ? ' · ' + ev.location : ''}`,
        event_description: ev.description || '',
      },
    };
  }

  // ─── EVENT_DETAILS → INFO ───
  if (screen === 'EVENT_DETAILS') {
    return infoScreen({ title: 'Thanks 🙏', body: 'Type *hi* anytime to open the menu again.' });
  }

  // ─── SERVICE_SELECT → OPTION_SELECT ───
  if (screen === 'SERVICE_SELECT') {
    const sid = data?.selected_service;
    const svc = getServiceById(sid);
    if (!svc) return handleInit(flow_token);
    return {
      screen: 'OPTION_SELECT',
      data: {
        option_banner: images[svc.bannerKey] || '',
        has_option_banner: !!images[svc.bannerKey],
        service_id: svc.id,
        service_title: svc.title,
        options: buildOptionList(svc.id, images),
      },
    };
  }

  // ─── OPTION_SELECT → DETAILS / SUCCESS-close ─────────────────────────
  // Continue from the issue list lands here. We look up the action and:
  //   • ticket / details_then_url → navigate IN-FLOW to DETAILS with the
  //     service / option pre-seeded (no extra "Open Form" card).
  //   • url / pdf / contact_mla / helplines / location_* → return the
  //     SUCCESS screen so WhatsApp closes the flow immediately and the
  //     webhook dispatcher fires the matching follow-up message.
  if (screen === 'OPTION_SELECT') {
    const sid = String(data?.service_id || '').trim();
    const oid = String(data?.selected_option || '').trim();
    const svc = getServiceById(sid);
    const opt = getOption(sid, oid);
    if (!svc || !opt) {
      return infoScreen({
        title: 'Issue not found',
        body: 'Please tap Close and type *hi* to choose again.',
      });
    }
    const action = getAction(svc.id, opt.id);
    const kind = action?.kind || '';

    // ticket / details_then_url → in-flow DETAILS with seeded data.
    if (kind === 'ticket' || kind === 'details_then_url') {
      const member = phone ? await Member.findOne({ phone }).lean() : null;
      return {
        screen: 'DETAILS',
        data: {
          service_id: svc.id,
          option_id: opt.id,
          service_title: svc.title,
          option_title: opt.title,
          init_phone: phone || '',
          init_name: member?.name || member?.profileName || '',
          show_school_name: opt.id === 'mid_day_meal_issue',
          school_label: 'School name',
        },
      };
    }

    // Everything else closes the flow immediately and is handled by the
    // post-action dispatcher. We re-use post_action='option_select' with
    // the chosen service/option as top-level params so the dispatcher's
    // dispatchOptionSelect() picks them up.
    return successScreen({
      flow_token,
      post_action: 'option_select',
      service_id: svc.id,
      selected_option: opt.id,
    });
  }

  // ─── DETAILS → submit (creates a ticketed request, then closes the flow with
  //   a post_action so the webhook can fire the confirmation message — and,
  //   for `details_then_url` actions, also send the relevant URL CTA). ───
  if (screen === 'DETAILS') {
    const sid = data?.service_id;
    const oid = data?.option_id;
    const svc = getServiceById(sid);
    const opt = getOption(sid, oid);
    const name = (data?.name || '').trim();
    const description = (data?.description || '').trim();
    const location = (data?.location || '').trim();
    const schoolName = (data?.school_name || '').trim();

    if (!svc || !opt || !phone || !name || !description) {
      return infoScreen({ title: 'Missing details', body: 'Please fill in your name and a description.' });
    }

    const action = getAction(svc.id, opt.id);
    const ticketId = await generateTicketId();

    try {
      await ServiceRequest.create({
        ticketId,
        phone,
        name,
        serviceId: svc.id,
        serviceTitle: svc.title,
        optionId: opt.id,
        optionTitle: opt.title,
        description,
        location,
        schoolName,
        status: 'pending',
      });
    } catch (err) {
      dbg('TICKET_CREATE_FAILED', { ticketId, error: err.message });
      return infoScreen({
        title: 'Could not save your request',
        body: 'Please try again in a moment.',
      });
    }

    await Member.findOneAndUpdate(
      { phone },
      {
        $set: { name },
        $inc: { requestCount: 1 },
        $setOnInsert: { firstSeenAt: new Date(), phone },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    // Decide what the post-Close confirmation should look like.
    //   - 'details_then_url' → send confirmation message with header image,
    //     ticket id, body and the URL CTA.
    //   - 'ticket' (or unmapped fallback) → send confirmation with header
    //     image, ticket id, body and 'Choose Service' CTA.
    const postKind = action?.kind === 'details_then_url' ? 'details_then_url' : 'ticket';
    return infoScreen({
      title: '🙏 Ticket Generated',
      body:
        `Thank you ${name}!\n\n` +
        `Your ticket *${ticketId}* for *${opt.title}* under *${svc.title}* has been recorded.\n` +
        'Tap *Close* to receive your confirmation on WhatsApp.',
      ...encodePostAction(postKind, {
        ticketId,
        serviceId: svc.id,
        optionId: opt.id,
        serviceTitle: svc.title,
        optionTitle: opt.title,
      }),
    });
  }

  return infoScreen({ title: 'Vanakkam 🙏', body: 'Type *hi* to open the menu again.' });
}

/* ───────── Registration flow ───────── */

async function memberDisplayName(phone) {
  if (!phone) return '';
  try {
    const m = await Member.findOne({ phone }).lean();
    return (m?.name || m?.profileName || '').trim();
  } catch {
    return '';
  }
}

async function safeLoadImages() {
  try {
    return await loadAllImages();
  } catch (err) {
    dbg('IMAGE_LOAD_ERROR', { message: err.message });
    return {};
  }
}

async function handleRegInit(flow_token) {
  const images = await safeLoadImages();
  const phone = phoneFromToken(flow_token);
  const initName = await memberDisplayName(phone);
  return {
    screen: 'REG_START',
    data: {
      welcome_banner: images.flow_welcome_banner || '',
      has_welcome_banner: !!images.flow_welcome_banner,
      error_text: '',
      has_error: false,
      init_phone: phone,
      init_name: initName,
      init_epic: '',
    },
  };
}

async function regStartScreen(images, phone, error = '', initEpic = '') {
  const initName = await memberDisplayName(phone);
  return {
    screen: 'REG_START',
    data: {
      welcome_banner: images.flow_welcome_banner || '',
      has_welcome_banner: !!images.flow_welcome_banner,
      error_text: error,
      has_error: !!error,
      init_phone: phone,
      init_name: initName,
      init_epic: initEpic,
    },
  };
}

async function regManualScreen(images, phone, opts = {}) {
  const { error = '', name = '', email = '' } = opts;
  // Fall back to WhatsApp profile name when caller didn't pass one (e.g. on
  // back navigation from REG_START to REG_MANUAL when the user clicks the
  // 'Register Manually' link.)
  const initName = name || (await memberDisplayName(phone));
  return {
    screen: 'REG_MANUAL',
    data: {
      welcome_banner: images.flow_welcome_banner || '',
      has_welcome_banner: !!images.flow_welcome_banner,
      init_phone: phone,
      init_name: initName,
      init_email: email,
      error_text: error,
      has_error: !!error,
    },
  };
}

function regDoneScreen(name) {
  const greet = name ? ` ${name}` : '';
  return {
    screen: 'REG_DONE',
    data: {
      info_title: '🙏 Registration Complete',
      info_body:
        `Thank you${greet}!\n\n` +
        'You are now registered with TVK Public Grievance.\n' +
        'Type *hi* anytime to raise a service request.',
    },
  };
}

async function handleRegDataExchange({ screen, data, flow_token }) {
  const phone = phoneFromToken(flow_token);
  const images = await safeLoadImages();

  // NOTE: WhatsApp Flow strips static keys from data_exchange payloads -
  // only ${form.X} form values reach the server. So we dispatch purely on
  // `screen`, which is always present and unambiguous because every
  // registration screen has exactly one data_exchange action.

  // ─── REG_START → REG_CONFIRM (lookup) / REG_START (with error) ───
  if (screen === 'REG_START') {
    {
      const epic = String(data?.epic_no || '').trim().toUpperCase();
      const dob = parseDob(data?.dob);
      dbg('REG_LOOKUP_EPIC', { phone, epic, rawDob: data?.dob, parsedDob: dob });
      if (!epic || !dob) {
        return regStartScreen(
          images,
          phone,
          'Please enter both EPIC number and Date of Birth.',
          epic
        );
      }
      let voter = null;
      try {
        voter = await findVoterByEpic(epic);
        dbg('REG_LOOKUP_RESULT', { epic, found: !!voter, voterName: voter?.name });
      } catch (err) {
        dbg('REG_LOOKUP_ERROR', { message: err.message, stack: err.stack });
        return regStartScreen(
          images,
          phone,
          'Voter database is temporarily unavailable. Please try again or register manually.',
          epic
        );
      }
      if (!voter) {
        return regStartScreen(
          images,
          phone,
          `No voter record found for EPIC "${epic}". Please check the number or register manually.`,
          epic
        );
      }
      // Stash dob + voter snapshot on the Member record so the next screen
      // (REG_CONFIRM) can finalize without re-fetching.
      if (phone) {
        await Member.findOneAndUpdate(
          { phone },
          {
            $set: {
              epicNo: voter.epicNo || epic,
              dob,
              voterSnapshot: voter,
            },
            $setOnInsert: { firstSeenAt: new Date(), phone },
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }

      const relationLabel =
        voter.relationType && /^h/i.test(voter.relationType)
          ? 'Husband'
          : voter.relationType && /^f/i.test(voter.relationType)
          ? 'Father'
          : voter.relationType && /^m/i.test(voter.relationType)
          ? 'Mother'
          : voter.relationType
          ? voter.relationType
          : 'Relation';

      const assemblyLabel =
        voter.assemblyName && voter.assemblyNo
          ? `${voter.assemblyName} (${voter.assemblyNo})`
          : voter.assemblyName || voter.assemblyNo || '—';

      return {
        screen: 'REG_CONFIRM',
        data: {
          voter_name: voter.name || '—',
          epic_no: voter.epicNo || epic,
          relation_label: relationLabel,
          relation_name: voter.relationName || '—',
          gender: voter.gender || '—',
          house_no: voter.houseNo || '—',
          assembly: assemblyLabel,
          dob_label: formatDobLabel(dob),
        },
      };
    }
  }

  // ─── REG_CONFIRM → REG_DONE (Confirm & Register footer) ───
  // The 'back' link is a navigate action and never reaches the server.
  if (screen === 'REG_CONFIRM') {
    if (!phone) {
      return regStartScreen(
        images,
        phone,
        'Could not identify your WhatsApp number. Please retry.'
      );
    }
    const member = await Member.findOne({ phone });
    if (!member || !member.voterSnapshot) {
      return regStartScreen(
        images,
        phone,
        'Session expired. Please re-enter your EPIC number.'
      );
    }
    member.name = member.voterSnapshot.name || member.name || '';
    member.gender = normalizeGender(member.voterSnapshot.gender) || member.gender || '';
    member.isRegistered = true;
    member.registrationType = 'epic';
    member.registeredAt = new Date();
    await member.save();
    return regDoneScreen(member.name || member.profileName || '');
  }

  // ─── REG_MANUAL → REG_DONE (Register footer) ───
  if (screen === 'REG_MANUAL') {
    {
      const name = (data?.name || '').trim();
      const email = (data?.email || '').trim();
      const dob = parseDob(data?.dob);
      const gender = normalizeGender(data?.gender);
      dbg('REG_SAVE_MANUAL', {
        phone,
        name,
        email,
        rawDob: data?.dob,
        parsedDob: dob,
        gender,
      });

      if (!phone) {
        return regManualScreen(images, phone, {
          error: 'Could not identify your WhatsApp number. Please retry.',
          name,
          email,
        });
      }
      if (!name) {
        return regManualScreen(images, phone, {
          error: 'Please enter your full name.',
          name,
          email,
        });
      }
      if (!dob) {
        return regManualScreen(images, phone, {
          error: 'Please pick a valid Date of Birth.',
          name,
          email,
        });
      }
      if (!gender) {
        return regManualScreen(images, phone, {
          error: 'Please select your Gender.',
          name,
          email,
        });
      }

      try {
        await Member.findOneAndUpdate(
          { phone },
          {
            $set: {
              name,
              email,
              dob,
              gender,
              isRegistered: true,
              registrationType: 'manual',
              registeredAt: new Date(),
            },
            $setOnInsert: { firstSeenAt: new Date(), phone },
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      } catch (err) {
        dbg('REG_SAVE_MANUAL_ERROR', { message: err.message });
        return regManualScreen(images, phone, {
          error: 'Could not save your details. Please try again.',
          name,
          email,
        });
      }
      return regDoneScreen(name);
    }
  }

  return regStartScreen(images, phone);
}

function normalizeGender(g) {
  if (!g) return '';
  const s = String(g).trim().toLowerCase();
  if (s.startsWith('m')) return 'Male';
  if (s.startsWith('f')) return 'Female';
  if (!s) return '';
  return 'Other';
}

/**
 * Pre-fetch the data needed to open the DETAILS form via
 * flow_action='navigate' for a given service+option pair. Returns null
 * if the pair is unknown. Used by postActionDispatcher when the user
 * picks a ticket / details_then_url issue in OPTION_SELECT.
 */
async function buildDetailsScreen(serviceId, optionId, phone) {
  const svc = getServiceById(serviceId);
  const opt = getOption(serviceId, optionId);
  if (!svc || !opt) return null;
  const member = phone ? await Member.findOne({ phone }).lean() : null;
  return {
    screen: 'DETAILS',
    data: {
      service_id: svc.id,
      option_id: opt.id,
      service_title: svc.title,
      option_title: opt.title,
      init_phone: phone,
      init_name: member?.name || member?.profileName || '',
      show_school_name: opt.id === 'mid_day_meal_issue',
      school_label: 'School name',
    },
  };
}

module.exports = router;
module.exports.clearImageCache = clearImageCache;
module.exports.buildDetailsScreen = buildDetailsScreen;
