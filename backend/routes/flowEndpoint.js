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
      // Banners (welcome banner + per-service banners) are the visual hero —
      // serve them at 2x retina (2000×250) at near-lossless q92 (≈200 KB JPG).
      // Icons stay small because up to 9 of them ship in the same response;
      // keeping them at 160×160 q70 (≈4-5 KB each) leaves room for the banner.
      const opts = isIcon
        ? { width: 160, height: 160, crop: 'fill', quality: 70, format: 'jpg' }
        : { width: 2000, height: 250, crop: 'fill', quality: 92, format: 'jpg' };
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
  return String(token).replace(/^welcome_/, '').replace(/\D/g, '');
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
    if (action === 'INIT' || action === 'BACK') {
      response = await handleInit(flow_token);
    } else if (action === 'data_exchange') {
      response = await handleDataExchange({ screen, data, flow_token });
    } else {
      response = await handleInit(flow_token);
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

module.exports = router;
module.exports.clearImageCache = clearImageCache;
