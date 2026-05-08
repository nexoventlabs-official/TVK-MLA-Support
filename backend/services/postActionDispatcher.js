/**
 * Dispatcher that runs AFTER the WhatsApp grievance flow closes.
 *
 * The flow's terminal INFO screen carries a `post_action` + `post_data_b64`
 * pair. The webhook decodes this and calls `dispatch()` which fires exactly
 * one of the following outbound message kinds:
 *
 *   contact_mla / helplines / social_media   → headed image + body + URL CTA
 *   url                                       → headed image + body + URL CTA
 *   pdf                                       → PDF document + caption
 *   ticket                                    → ticket confirmation + welcome flow
 *   details_then_url                          → ticket confirmation + URL CTA
 *   location_only_ticket                      → starts the location state machine
 *   location_photos_ticket                    → starts the location+photos state machine
 *
 * Falls back to a sendText if anything goes wrong, so the user never sees
 * total silence after closing a flow.
 */

const meta = require('./metaCloud');
const flowImages = require('./flowImages');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');
const { getAction } = require('./issueActions');
const { generateTicketId } = require('./ticketing');

// ─── Static config (placeholders the user can override later via admin) ───
const CONTACT_MLA = {
  name: 'TVK MLA Office',
  phone: process.env.MLA_OFFICE_PHONE || '+91 99999 99999',
  email: process.env.MLA_OFFICE_EMAIL || 'office@tvk.example',
  address: process.env.MLA_OFFICE_ADDRESS || 'TVK Constituency Office',
};

const HELPLINES_URL = process.env.HELPLINES_URL || 'https://chennai.nic.in/helpline/';

const SOCIAL_LINKS = {
  facebook: process.env.SOCIAL_FACEBOOK || 'https://www.facebook.com/TamilagaVettriKazhagam',
  instagram: process.env.SOCIAL_INSTAGRAM || 'https://www.instagram.com/tvkofficial/',
  youtube: process.env.SOCIAL_YOUTUBE || 'https://www.youtube.com/@TVKOfficial',
  twitter: process.env.SOCIAL_TWITTER || 'https://x.com/TVK_Official',
};

/* ─────────────────────────── decode helper ─────────────────────────── */

function decodePostData(b64) {
  if (!b64 || typeof b64 !== 'string') return {};
  try {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) || {};
  } catch (err) {
    console.warn('[postActionDispatcher] decode failed:', err.message);
    return {};
  }
}

/* ─────────────────────────── senders ─────────────────────────── */

async function sendContactMla(phone) {
  const banner = await flowImages.getUrl('header_contact_mla');
  const body =
    `*${CONTACT_MLA.name}*\n\n` +
    `📞 Phone: ${CONTACT_MLA.phone}\n` +
    `📧 Email: ${CONTACT_MLA.email}\n` +
    `🏢 ${CONTACT_MLA.address}\n\n` +
    `Tap the number above to call our office directly.`;
  if (banner) {
    await meta.sendImage(phone, banner, body);
  } else {
    await meta.sendText(phone, body);
  }
}

async function sendHelplines(phone) {
  const banner = await flowImages.getUrl('header_helplines');
  await meta.sendCtaUrl(phone, {
    headerImageUrl: banner || undefined,
    headerText: !banner ? 'Helpline Directory' : undefined,
    body:
      '*Important Helpline Numbers*\n\n' +
      '🚑 Ambulance: *108*\n' +
      '🚓 Police: *100*\n' +
      '🚒 Fire: *101*\n' +
      '👶 Childline: *1098*\n' +
      '👩 Women: *181*\n\n' +
      'Tap below to view the full Tamil Nadu helpline directory.',
    footer: 'TVK Public Grievance',
    ctaLabel: 'Open Directory',
    ctaUrl: HELPLINES_URL,
  });
}

async function sendSocialMedia(phone) {
  const banner = await flowImages.getUrl('header_social');
  const body =
    '*Follow TVK online* 🇮🇳\n\n' +
    `📘 Facebook: ${SOCIAL_LINKS.facebook}\n` +
    `📸 Instagram: ${SOCIAL_LINKS.instagram}\n` +
    `▶️ YouTube: ${SOCIAL_LINKS.youtube}\n` +
    `🐦 X / Twitter: ${SOCIAL_LINKS.twitter}\n\n` +
    'Tap any link to open the page.';
  if (banner) {
    await meta.sendImage(phone, banner, body);
  } else {
    await meta.sendText(phone, body);
  }
}

async function sendUrlCta(phone, { serviceId, optionId, optionTitle }) {
  const action = getAction(serviceId, optionId);
  if (!action || action.kind !== 'url') {
    await meta.sendText(phone, 'Sorry — the link you requested is not available.');
    return;
  }
  const banner = await flowImages.getUrl(action.headerKey);
  const ctaLabel = action.ctaLabel || 'Open Link';
  const body =
    `*${optionTitle}*\n\n` +
    `Use the official portal below to proceed with your *${optionTitle}* request.\n` +
    'TVK is happy to help if you face any issue.';
  await meta.sendCtaUrl(phone, {
    headerImageUrl: banner || undefined,
    headerText: !banner ? optionTitle : undefined,
    body,
    footer: 'TVK Public Grievance',
    ctaLabel,
    ctaUrl: action.url,
  });
}

async function sendPdf(phone, { serviceId, optionId, optionTitle }) {
  const action = getAction(serviceId, optionId);
  if (!action || action.kind !== 'pdf') {
    await meta.sendText(phone, 'Sorry — the document you requested is not available.');
    return;
  }
  const banner = await flowImages.getUrl(action.headerKey);
  const pdfUrl = await flowImages.getUrl(action.pdfKey);
  if (!pdfUrl) {
    await meta.sendText(
      phone,
      `Sorry — the *${optionTitle}* form is not uploaded yet. Please ask the admin to upload it.`
    );
    return;
  }
  if (banner) {
    await meta.sendImage(phone, banner, `*${optionTitle}*\n\nThe form is attached below.`).catch(() => {});
  }
  await meta.sendDocument(phone, {
    url: pdfUrl,
    filename: `${optionId}.pdf`,
    caption: `${optionTitle} — please fill and submit at your nearest office.`,
  });
  // Re-launch the welcome flow so the user can pick another option.
  await sendWelcomeFlowSafe(phone);
}

async function sendTicketConfirmation(phone, { ticketId, serviceTitle, optionTitle, serviceId, optionId }) {
  const action = getAction(serviceId, optionId);
  const banner =
    (action?.headerKey && (await flowImages.getUrl(action.headerKey))) ||
    (await flowImages.getUrl('chat_welcome_header'));

  const body =
    `🙏 *Ticket Generated*\n\n` +
    `Ticket ID: *${ticketId}*\n` +
    `Service: ${serviceTitle}\n` +
    `Issue: ${optionTitle}\n` +
    `Status: *Pending*\n\n` +
    'Our team will review your request and update you here. ' +
    'Tap *Choose Service* below to raise another grievance.';

  await sendWelcomeFlowSafe(phone, { body, banner });
}

async function sendDetailsThenUrlConfirmation(
  phone,
  { ticketId, serviceTitle, optionTitle, serviceId, optionId }
) {
  const action = getAction(serviceId, optionId);
  if (!action || action.kind !== 'details_then_url') {
    return sendTicketConfirmation(phone, { ticketId, serviceTitle, optionTitle, serviceId, optionId });
  }
  const banner = await flowImages.getUrl(action.headerKey);
  const body =
    `🙏 *Ticket Generated*\n\n` +
    `Ticket ID: *${ticketId}*\n` +
    `Service: ${serviceTitle}\n` +
    `Issue: ${optionTitle}\n` +
    `Status: *Pending*\n\n` +
    'For faster resolution you can also use the official portal below.';
  await meta.sendCtaUrl(phone, {
    headerImageUrl: banner || undefined,
    headerText: !banner ? optionTitle : undefined,
    body,
    footer: 'TVK Public Grievance',
    ctaLabel: action.ctaLabel || 'Open Portal',
    ctaUrl: action.url,
  });
}

async function startLocationFlow(phone, { kind, serviceId, optionId, serviceTitle, optionTitle }) {
  const action = getAction(serviceId, optionId);
  if (!action) return;

  // Stash the pending action on the Member record. The webhook's location
  // and image handlers will pick this up to drive the next step.
  await Member.findOneAndUpdate(
    { phone },
    {
      $set: {
        pendingAction: {
          kind,
          serviceId,
          optionId,
          serviceTitle,
          optionTitle,
          step: 'awaiting_location',
          minPhotos: kind === 'location_photos_ticket' ? action.minPhotos || 1 : 0,
          mediaUrls: [],
          geo: null,
          ticketId: '',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min idle window
        },
      },
      $setOnInsert: { firstSeenAt: new Date(), phone },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const banner = await flowImages.getUrl(action.headerKey);
  const body =
    `📍 *Share your location*\n\n` +
    `To raise a *${optionTitle}* ticket, please share your *current location*:\n\n` +
    '1️⃣ Tap the 📎 attachment icon below\n' +
    '2️⃣ Select *Location*\n' +
    '3️⃣ Send your *current location*\n\n' +
    'We are waiting for your location 🙏';

  if (banner) {
    await meta.sendImage(phone, banner, body).catch(() => {});
  } else {
    await meta.sendText(phone, body).catch(() => {});
  }
}

/**
 * Re-send the grievance welcome flow with a custom body / banner so the user
 * can launch another request after a ticket is generated. Wrapped in a try /
 * catch so dispatcher failures never throw out of the webhook.
 */
async function sendWelcomeFlowSafe(phone, { body, banner } = {}) {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    await meta
      .sendText(phone, body || 'Type *hi* to open the menu again.')
      .catch(() => {});
    return;
  }
  const headerImageUrl = banner || (await flowImages.getUrl('chat_welcome_header'));
  const mode =
    String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED'
      ? 'published'
      : 'draft';
  try {
    await meta.sendFlowMessage(phone, {
      flowId,
      flowCta: 'Choose Service',
      headerImageUrl: headerImageUrl || undefined,
      headerText: !headerImageUrl ? 'TVK Public Grievance' : undefined,
      bodyText:
        body ||
        'Vanakkam 🙏\n\nTap *Choose Service* below to raise a grievance.',
      footerText: 'TVK – Tamilaga Vettri Kazhagam',
      flowToken: `welcome_${phone}`,
      mode,
    });
  } catch (err) {
    console.error('[postActionDispatcher] sendWelcomeFlowSafe failed:', err.response?.data || err.message);
    await meta
      .sendText(phone, body || 'Type *hi* to open the menu again.')
      .catch(() => {});
  }
}

/* ─────────────────────────── orchestrator ─────────────────────────── */

/**
 * Top-level dispatch called by the webhook when the user closes the welcome
 * flow with a non-empty `post_action`.
 */
async function dispatch({ phone, postAction, postDataB64 }) {
  if (!phone || !postAction) return;
  const payload = decodePostData(postDataB64);
  console.log('[postActionDispatcher] dispatch', { phone, postAction, payload });

  try {
    switch (postAction) {
      case 'contact_mla':
        await sendContactMla(phone);
        return;
      case 'helplines':
        await sendHelplines(phone);
        return;
      case 'social_media':
        await sendSocialMedia(phone);
        return;
      case 'url':
        await sendUrlCta(phone, payload);
        return;
      case 'pdf':
        await sendPdf(phone, payload);
        return;
      case 'ticket':
        await sendTicketConfirmation(phone, payload);
        return;
      case 'details_then_url':
        await sendDetailsThenUrlConfirmation(phone, payload);
        return;
      case 'location_only_ticket':
      case 'location_photos_ticket':
        await startLocationFlow(phone, { ...payload, kind: postAction });
        return;
      default:
        console.warn('[postActionDispatcher] unknown postAction:', postAction);
    }
  } catch (err) {
    console.error('[postActionDispatcher] dispatch error:', err.response?.data || err.message);
    await meta
      .sendText(phone, 'Something went wrong while processing your request. Please type *hi* to try again.')
      .catch(() => {});
  }
}

module.exports = {
  dispatch,
  // Re-exported so the webhook can call them directly when it finishes the
  // location / photos state-machine and needs to create the ticket.
  sendTicketConfirmation,
  generateTicketId,
  sendWelcomeFlowSafe,
  ServiceRequest,
};
