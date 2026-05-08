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
const { getServiceById, getOption } = require('./serviceCatalog');
const { generateTicketId } = require('./ticketing');
// flowEndpoint exposes screen builders we use to send sub-flow messages.
const flowEndpoint = require('../routes/flowEndpoint');

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

  // 1) Branding image + office info body so the user has full context.
  const intro =
    `*${CONTACT_MLA.name}*\n\n` +
    `📞 ${CONTACT_MLA.phone}\n` +
    `📧 ${CONTACT_MLA.email}\n` +
    `🏢 ${CONTACT_MLA.address}\n\n` +
    `Tap the contact card below — then tap *Call* to reach our office directly.`;
  if (banner) {
    await meta.sendImage(phone, banner, intro).catch(() => {});
  } else {
    await meta.sendText(phone, intro).catch(() => {});
  }

  // 2) WhatsApp vCard. Tapping the card opens Save/Call options; tapping
  //    the phone row opens the dialer — this is our effective Call CTA
  //    (WhatsApp's standard interactive messages do not expose a `tel:`
  //    button outside approved templates).
  const phoneDigits = String(CONTACT_MLA.phone).replace(/\D/g, '');
  const formattedPhone = phoneDigits.startsWith('+')
    ? CONTACT_MLA.phone
    : `+${phoneDigits}`;
  const contact = {
    name: {
      formatted_name: CONTACT_MLA.name,
      first_name: CONTACT_MLA.name,
    },
    org: { company: 'Tamilaga Vettri Kazhagam', title: 'MLA Office' },
    phones: [
      {
        phone: formattedPhone,
        type: 'WORK',
        wa_id: phoneDigits,
      },
    ],
    emails: CONTACT_MLA.email
      ? [{ email: CONTACT_MLA.email, type: 'WORK' }]
      : undefined,
    addresses: CONTACT_MLA.address
      ? [{ street: CONTACT_MLA.address, type: 'WORK' }]
      : undefined,
  };
  try {
    await meta.sendContact(phone, contact);
  } catch (err) {
    // vCard delivery failed — the intro message still shows the phone
    // number which WhatsApp auto-links for tap-to-call on most clients.
    console.warn(
      '[postActionDispatcher] sendContact failed:',
      err.response?.data || err.message
    );
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

/**
 * Per-platform metadata used to render the platform-specific CTA URL
 * message (image header + body + green Open-in-<platform> button).
 */
const SOCIAL_PLATFORMS = {
  facebook: {
    url: SOCIAL_LINKS.facebook,
    iconKey: 'icon_social_facebook',
    title: 'Facebook',
    emoji: '📘',
    ctaLabel: 'Open Facebook',
  },
  instagram: {
    url: SOCIAL_LINKS.instagram,
    iconKey: 'icon_social_instagram',
    title: 'Instagram',
    emoji: '📸',
    ctaLabel: 'Open Instagram',
  },
  youtube: {
    url: SOCIAL_LINKS.youtube,
    iconKey: 'icon_social_youtube',
    title: 'YouTube',
    emoji: '▶️',
    ctaLabel: 'Open YouTube',
  },
  twitter: {
    url: SOCIAL_LINKS.twitter,
    iconKey: 'icon_social_twitter',
    title: 'X (Twitter)',
    emoji: '🐦',
    ctaLabel: 'Open X (Twitter)',
  },
};

/**
 * Send a per-platform follow card with the platform's icon as an image
 * header and a green CTA URL button that opens that page. Falls back to
 * the legacy multi-link text if the flow sent no platform (older flow
 * cached on Meta) or the platform is unknown.
 */
async function sendSocialPlatform(phone, { platform } = {}) {
  const spec = SOCIAL_PLATFORMS[String(platform || '').trim().toLowerCase()];
  if (!spec || !spec.url) return sendSocialMediaLegacy(phone);
  const banner = await flowImages.getUrl(spec.iconKey);
  const body =
    `${spec.emoji} *Follow TVK on ${spec.title}*\n\n` +
    `Tap *${spec.ctaLabel}* below to open our official ${spec.title} page.`;
  await meta.sendCtaUrl(phone, {
    headerImageUrl: banner || undefined,
    headerText: !banner ? spec.title : undefined,
    body,
    footer: 'TVK – Tamilaga Vettri Kazhagam',
    ctaLabel: spec.ctaLabel,
    ctaUrl: spec.url,
  });
}

/**
 * Legacy social dump kept as a safety net for clients that closed the
 * flow without a `platform` payload (cached flow JSON, manual testing).
 */
async function sendSocialMediaLegacy(phone) {
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
    `To raise a *${optionTitle}* ticket, please share your *current location*.\n\n` +
    'Tap the *Send Location* button below 🙏';
  const fallbackBody =
    `📍 *Share your location*\n\n` +
    `To raise a *${optionTitle}* ticket, please share your *current location*:\n\n` +
    '1️⃣ Tap the 📎 attachment icon below\n' +
    '2️⃣ Select *Location*\n' +
    '3️⃣ Send your *current location*\n\n' +
    'We are waiting for your location 🙏';

  // Send the banner as a separate image first (location_request_message
  // does NOT support a header image), then the native location request.
  if (banner) {
    await meta.sendImage(phone, banner, '').catch(() => {});
  }

  try {
    await meta.sendLocationRequest(phone, body);
  } catch (err) {
    console.warn(
      '[postActionDispatcher] sendLocationRequest failed, falling back to text:',
      err.response?.data || err.message
    );
    await meta.sendText(phone, fallbackBody).catch(() => {});
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

/**
 * Send a fresh flow message that opens the same Meta flow directly at the
 * given `screen` with seeded `data`. Used for ticket / details_then_url
 * issues so the user is handed a brand-new flow card pre-pointed at the
 * DETAILS form (no redundant "Tap Close" intermediate screen).
 */
async function sendSubFlow(phone, { screen, data, bodyText, headerImageUrl, headerText, flowCta, flowToken }) {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    await meta.sendText(phone, bodyText || 'Tap to continue.').catch(() => {});
    return;
  }
  const mode =
    String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED'
      ? 'published'
      : 'draft';
  try {
    await meta.sendFlowMessage(phone, {
      flowId,
      flowCta: flowCta || 'Open Form',
      headerImageUrl: headerImageUrl || undefined,
      headerText: !headerImageUrl ? headerText || undefined : undefined,
      bodyText: bodyText || 'Tap to continue.',
      footerText: 'TVK – Tamilaga Vettri Kazhagam',
      flowToken: flowToken || `welcome_${phone}`,
      mode,
      screen,
      data,
    });
  } catch (err) {
    console.error('[postActionDispatcher] sendSubFlow failed:', err.response?.data || err.message);
    await meta
      .sendText(phone, bodyText || 'Sorry, please type *hi* to open the menu again.')
      .catch(() => {});
  }
}

/**
 * Dispatch the user's OPTION_SELECT pick. The flow has already closed; we
 * look up the action via issueActions and route accordingly:
 *   url / pdf / contact_mla / helplines           → existing senders
 *   location_only_ticket / location_photos_ticket → start state machine
 *   ticket / details_then_url                     → fresh DETAILS sub-flow
 */
async function dispatchOptionSelect(phone, { service_id, selected_option } = {}) {
  const svc = getServiceById(service_id);
  const opt = getOption(service_id, selected_option);
  if (!svc || !opt) {
    await meta
      .sendText(phone, 'Sorry, that selection is no longer available. Please type *hi* to try again.')
      .catch(() => {});
    return;
  }
  const action = getAction(svc.id, opt.id);
  const payload = {
    serviceId: svc.id,
    optionId: opt.id,
    serviceTitle: svc.title,
    optionTitle: opt.title,
  };
  switch (action?.kind) {
    case 'url':
      await sendUrlCta(phone, payload);
      return;
    case 'pdf':
      await sendPdf(phone, payload);
      return;
    case 'contact_mla':
      await sendContactMla(phone);
      return;
    case 'helplines':
      await sendHelplines(phone);
      return;
    case 'location_only_ticket':
    case 'location_photos_ticket':
      await startLocationFlow(phone, { ...payload, kind: action.kind });
      return;
    case 'ticket':
    case 'details_then_url': {
      const screenObj = await flowEndpoint.buildDetailsScreen(svc.id, opt.id, phone);
      if (!screenObj) {
        await meta
          .sendText(phone, 'Sorry, that issue type is unavailable right now.')
          .catch(() => {});
        return;
      }
      const banner = await flowImages.getUrl(action?.headerKey || svc.bannerKey);
      await sendSubFlow(phone, {
        ...screenObj,
        bodyText:
          `*${opt.title}*\n\n` +
          `Tap *Open Form* below to share a few details so we can register your *${opt.title}* ticket.`,
        headerImageUrl: banner || undefined,
        headerText: !banner ? opt.title : undefined,
        flowCta: 'Open Form',
        flowToken: `details_${phone}`,
      });
      return;
    }
    default:
      console.warn('[postActionDispatcher] unhandled option kind:', action?.kind, {
        service_id,
        selected_option,
      });
      await meta
        .sendText(
          phone,
          `Support for *${opt.title}* is coming soon. Please type *hi* to choose another option.`
        )
        .catch(() => {});
  }
}

/* ─────────────────────────── orchestrator ─────────────────────────── */

/**
 * Top-level dispatch called by the webhook when the user closes the welcome
 * flow with a non-empty `post_action`.
 *
 * `rawPayload` is the entire parsed nfm_reply.response_json. Top-level
 * fields a `complete` action sets directly (e.g. OPTION_SELECT carries
 * `service_id` + `selected_option`) merge with the base64-decoded payload
 * so all senders see a uniform object.
 */
async function dispatch({ phone, postAction, postDataB64, rawPayload = {} }) {
  if (!phone || !postAction) return;
  const decoded = decodePostData(postDataB64);
  const payload = {
    ...rawPayload,
    ...decoded,
  };
  // Strip control fields so senders see clean data.
  delete payload.post_action;
  delete payload.post_data_b64;
  delete payload.flow_token;
  console.log('[postActionDispatcher] dispatch', { phone, postAction, payload });

  try {
    switch (postAction) {
      // OPTION_SELECT closed the flow with the picked issue id.
      case 'option_select':
        await dispatchOptionSelect(phone, payload);
        return;
      case 'contact_mla':
        await sendContactMla(phone);
        return;
      case 'helplines':
        await sendHelplines(phone);
        return;
      case 'social_media':
        // New SOCIAL_SELECT flow closes with payload.platform set; older
        // clients (cached flow JSON) may omit it → legacy multi-link dump.
        await sendSocialPlatform(phone, payload);
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
