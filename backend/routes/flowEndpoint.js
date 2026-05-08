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
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');

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

  const keys = ['flow_welcome_banner'];
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
    const fallback = {
      screen: 'INFO',
      data: { info_title: 'Something went wrong', info_body: 'Please try again later.' },
    };
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
    screen: 'SERVICE_SELECT',
    data: {
      welcome_banner: images.flow_welcome_banner || '',
      has_welcome_banner: !!images.flow_welcome_banner,
      services: buildServiceList(images),
    },
  };
}

/* ───────── data_exchange ───────── */
async function handleDataExchange({ screen, data, flow_token }) {
  const phone = phoneFromToken(flow_token);
  const images = await loadAllImages();

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

  // ─── OPTION_SELECT → DETAILS ───
  if (screen === 'OPTION_SELECT') {
    const sid = data?.service_id;
    const oid = data?.selected_option;
    const svc = getServiceById(sid);
    const opt = getOption(sid, oid);
    if (!svc || !opt) {
      return {
        screen: 'INFO',
        data: { info_title: 'Selection not found', info_body: 'Please try again from the menu.' },
      };
    }
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
      },
    };
  }

  // ─── DETAILS → submit ───
  if (screen === 'DETAILS') {
    const sid = data?.service_id;
    const oid = data?.option_id;
    const svc = getServiceById(sid);
    const opt = getOption(sid, oid);
    const name = (data?.name || '').trim();
    const description = (data?.description || '').trim();
    const location = (data?.location || '').trim();

    if (!svc || !opt || !phone || !name || !description) {
      return {
        screen: 'INFO',
        data: { info_title: 'Missing details', info_body: 'Please fill in your name and a description.' },
      };
    }

    await ServiceRequest.create({
      phone,
      name,
      serviceId: svc.id,
      serviceTitle: svc.title,
      optionId: opt.id,
      optionTitle: opt.title,
      description,
      location,
    });

    // Update Member's saved name and request count
    await Member.findOneAndUpdate(
      { phone },
      {
        $set: { name },
        $inc: { requestCount: 1 },
        $setOnInsert: { firstSeenAt: new Date(), phone },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return {
      screen: 'INFO',
      data: {
        info_title: '🙏 Request received',
        info_body:
          `Thank you ${name}!\n\n` +
          `Your *${opt.title}* request under *${svc.title}* has been recorded. ` +
          `Our team will review it and follow up on this WhatsApp number.`,
      },
    };
  }

  return {
    screen: 'INFO',
    data: { info_title: 'Vanakkam 🙏', info_body: 'Type *hi* to open the menu again.' },
  };
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

async function handleRegInit(flow_token) {
  const images = await loadAllImages();
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
    },
  };
}

async function regStartScreen(images, phone, error = '') {
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
  const images = await loadAllImages();
  const action = data?.action;

  // ─── REG_START → REG_CONFIRM (lookup) / REG_MANUAL / REG_START (with error) ───
  if (screen === 'REG_START') {
    if (action === 'goto_manual') {
      return regManualScreen(images, phone);
    }
    if (action === 'lookup_epic') {
      const epic = String(data?.epic_no || '').trim().toUpperCase();
      const dob = parseDob(data?.dob);
      dbg('REG_LOOKUP_EPIC', { phone, epic, rawDob: data?.dob, parsedDob: dob });
      if (!epic || !dob) {
        return regStartScreen(
          images,
          phone,
          'Please enter both EPIC number and Date of Birth.'
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
          'Voter database is temporarily unavailable. Please try again or register manually.'
        );
      }
      if (!voter) {
        return regStartScreen(
          images,
          phone,
          `No voter record found for EPIC "${epic}". Please check the number or register manually.`
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
    return regStartScreen(images, phone);
  }

  // ─── REG_CONFIRM → REG_DONE (save) / REG_START (back) ───
  if (screen === 'REG_CONFIRM') {
    if (action === 'back_to_start') {
      return regStartScreen(images, phone);
    }
    if (action === 'save_epic') {
      if (!phone) {
        return regStartScreen(images, phone, 'Could not identify your WhatsApp number. Please retry.');
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
    return regStartScreen(images, phone);
  }

  // ─── REG_MANUAL → REG_DONE (save_manual) ───
  if (screen === 'REG_MANUAL') {
    if (action === 'save_manual') {
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
    return regManualScreen(images, phone);
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

module.exports = router;
module.exports.clearImageCache = clearImageCache;
