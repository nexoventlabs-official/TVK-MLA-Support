const axios = require('axios');
const FormData = require('form-data');

function cfg() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const wabaId = process.env.META_WABA_ID;
  const appId = process.env.META_APP_ID;
  const v = process.env.META_GRAPH_VERSION || 'v22.0';
  if (!accessToken || !phoneNumberId || !wabaId) {
    throw new Error('Meta config missing — set META_ACCESS_TOKEN / META_PHONE_NUMBER_ID / META_WABA_ID');
  }
  return {
    accessToken,
    phoneNumberId,
    wabaId,
    appId,
    graphVersion: v,
    baseUrl: `https://graph.facebook.com/${v}/${phoneNumberId}`,
    graphRoot: `https://graph.facebook.com/${v}`,
  };
}

const api = axios.create({ timeout: 60000 });

/* ─── Outbound messages ─── */

async function sendText(to, text) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: { body: text, preview_url: false },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

async function sendImage(to, imageUrl, caption = '') {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'image',
    image: { link: imageUrl, caption },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Send a document (PDF, etc.) by URL. Used for the "Seeds Subsidy" /
 * "Flood Compensation" branches of the grievance flow that hand the user
 * a downloadable form.
 */
async function sendDocument(to, { url, filename, caption = '' }) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'document',
    document: { link: url, filename: filename || 'document.pdf', caption },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Send an interactive *CTA URL* message — header (image OR text), body,
 * optional footer and a single tappable URL button. Used to hand the user
 * the appropriate government portal URL after they pick a 'url' issue.
 *
 * `headerImageUrl` is preferred; falls back to `headerText` when no image.
 */
async function sendCtaUrl(to, { headerImageUrl, headerText, body, footer, ctaLabel, ctaUrl }) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  if (!ctaLabel || !ctaUrl) throw new Error('sendCtaUrl: ctaLabel and ctaUrl are required');

  let header;
  if (headerImageUrl) header = { type: 'image', image: { link: headerImageUrl } };
  else if (headerText) header = { type: 'text', text: String(headerText).slice(0, 60) };

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      ...(header ? { header } : {}),
      body: { text: body || '' },
      ...(footer ? { footer: { text: String(footer).slice(0, 60) } } : {}),
      action: {
        name: 'cta_url',
        parameters: { display_text: String(ctaLabel).slice(0, 20), url: ctaUrl },
      },
    },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Send an interactive *location_request_message* — renders a single
 * native "Send Location" button in WhatsApp that opens the location
 * picker directly. Far better UX than asking the user to tap the
 * paperclip icon.
 *
 * Note: Meta's location_request_message does NOT support a header image,
 * so callers should send the banner as a separate sendImage call first
 * if they want one.
 */
async function sendLocationRequest(to, body) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'location_request_message',
      body: { text: String(body || '').slice(0, 1024) },
      action: { name: 'send_location' },
    },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Send a WhatsApp contact (vCard) message. The contact's phone rows are
 * tappable on WhatsApp — tapping opens the dialer, giving us a tap-to-call
 * CTA for free (WhatsApp's interactive messages do not expose a native
 * `tel:` button outside approved templates).
 *
 * `contact` is a single object per Meta's contacts schema:
 *   { name: { formatted_name, first_name? }, org?, phones: [{ phone, type?, wa_id? }], emails?, addresses? }
 */
async function sendContact(to, contact) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'contacts',
    contacts: [contact],
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Download a media object the user uploaded (image / location-shared image /
 * etc.) from Meta. Returns a Buffer + mimeType. Two-step: first GET the
 * media metadata to obtain the temporary URL, then GET that URL with the
 * Bearer token.
 */
async function downloadMedia(mediaId) {
  const { graphRoot, accessToken } = cfg();
  const meta = await api.get(`${graphRoot}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { fields: 'url,mime_type,sha256,file_size' },
  });
  const mediaUrl = meta.data?.url;
  if (!mediaUrl) throw new Error('Media URL not returned by Graph API');
  const bin = await api.get(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: 'arraybuffer',
    maxContentLength: 30 * 1024 * 1024,
    maxBodyLength: 30 * 1024 * 1024,
  });
  return { buffer: Buffer.from(bin.data), mimeType: meta.data.mime_type || 'application/octet-stream' };
}

/**
 * Send an interactive Flow message.
 */
async function sendFlowMessage(to, options) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');

  const {
    flowId,
    flowCta,
    headerImageUrl,
    headerDocumentUrl,
    headerDocumentFilename,
    headerText,
    bodyText,
    footerText,
    flowToken = `welcome_${phone}`,
    mode = 'published',
    // Optional: open the flow directly at a specific screen with seeded
    // data. When `screen` is provided we use flow_action='navigate' so the
    // client jumps straight to that screen and skips the INIT round-trip.
    screen,
    data: seedData,
  } = options;

  // Document headers let an interactive flow message double as the PDF
  // delivery — used by sendPdf to combine the form download and the
  // 'Choose Service' CTA into a single chat bubble.
  let header;
  if (headerDocumentUrl) {
    header = {
      type: 'document',
      document: {
        link: headerDocumentUrl,
        filename: headerDocumentFilename || 'document.pdf',
      },
    };
  } else if (headerImageUrl) {
    header = { type: 'image', image: { link: headerImageUrl } };
  } else if (headerText) {
    header = { type: 'text', text: headerText };
  }

  const useNavigate = !!screen;
  const parameters = {
    flow_message_version: '3',
    flow_token: flowToken,
    flow_id: flowId,
    flow_cta: flowCta,
    mode,
    flow_action: useNavigate ? 'navigate' : 'data_exchange',
  };
  if (useNavigate) {
    parameters.flow_action_payload = {
      screen,
      ...(seedData ? { data: seedData } : {}),
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'flow',
      ...(header ? { header } : {}),
      body: { text: bodyText },
      action: {
        name: 'flow',
        parameters,
      },
    },
  };
  if (footerText) payload.interactive.footer = { text: footerText };

  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Send an approved template message to a recipient.
 * `components` is an array per WhatsApp Cloud API spec (header / body / button).
 */
async function sendTemplate(to, { name, language, components = [] }) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name,
      language: { code: language || 'en_US' },
      ...(components.length ? { components } : {}),
    },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Send an Authentication-category template that delivers a 6-digit OTP code.
 *
 * The template (registered in Meta WABA Manager) is expected to have:
 *   - Category: AUTHENTICATION
 *   - One BODY parameter for the code: e.g. "Your TVK Mylapore portal code is {{1}}."
 *   - One BUTTON of sub-type OTP / COPY_CODE that takes {{1}} as the code parameter.
 *
 * The web portal calls this on /api/portal/auth/send-otp. The WhatsApp bot
 * remains untouched — it never invokes this helper.
 */
async function sendOtpTemplate(to, code) {
  const name = process.env.META_OTP_TEMPLATE_NAME || 'tvk_portal_otp';
  const language = process.env.META_OTP_TEMPLATE_LANGUAGE || 'en_US';
  const components = [
    {
      type: 'body',
      parameters: [{ type: 'text', text: String(code) }],
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: String(code) }],
    },
  ];
  return sendTemplate(to, { name, language, components });
}

/* ─── Flow management ─── */

async function createFlow(name, categories = ['OTHER'], { endpointUri } = {}) {
  const { graphRoot, accessToken, wabaId } = cfg();
  const body = { name, categories };
  if (endpointUri) body.endpoint_uri = endpointUri;
  const { data } = await api.post(`${graphRoot}/${wabaId}/flows`, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

async function updateFlowJSON(flowId, flowJsonObj) {
  const { graphRoot, accessToken } = cfg();
  const fd = new FormData();
  fd.append('file', Buffer.from(JSON.stringify(flowJsonObj)), {
    filename: 'flow.json',
    contentType: 'application/json',
  });
  fd.append('name', 'flow.json');
  fd.append('asset_type', 'FLOW_JSON');
  const { data } = await api.post(`${graphRoot}/${flowId}/assets`, fd, {
    headers: { Authorization: `Bearer ${accessToken}`, ...fd.getHeaders() },
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024,
  });
  return data;
}

async function publishFlow(flowId) {
  const { graphRoot, accessToken } = cfg();
  const { data } = await api.post(
    `${graphRoot}/${flowId}/publish`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

async function setFlowEndpoint(flowId, endpointUri, { autoPublish = true } = {}) {
  const { graphRoot, accessToken } = cfg();
  const { data } = await api.post(
    `${graphRoot}/${flowId}`,
    { endpoint_uri: endpointUri },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (autoPublish) {
    try {
      await publishFlow(flowId);
    } catch (err) {
      console.warn('[metaCloud.setFlowEndpoint] re-publish failed:', err.response?.data || err.message);
    }
  }
  return data;
}

async function uploadBusinessPublicKey(publicKeyPem) {
  const { phoneNumberId, accessToken, graphVersion } = cfg();
  const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/whatsapp_business_encryption`;
  const fd = new URLSearchParams();
  fd.append('business_public_key', publicKeyPem);
  const { data } = await api.post(url, fd.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return data;
}

/* ─── Message Templates (Campaigns) ─── */

/**
 * Create a message template via the WABA endpoint. Returns `{ id, status, category }`.
 * `components` follows the WhatsApp Cloud API contract.
 */
async function createTemplate({ name, language = 'en_US', category = 'MARKETING', components = [] }) {
  const { graphRoot, accessToken, wabaId } = cfg();
  const body = { name, language, category, components };
  const { data } = await api.post(`${graphRoot}/${wabaId}/message_templates`, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

async function deleteTemplate({ name, hsmId }) {
  const { graphRoot, accessToken, wabaId } = cfg();
  const params = { name };
  if (hsmId) params.hsm_id = hsmId;
  const { data } = await api.delete(`${graphRoot}/${wabaId}/message_templates`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params,
  });
  return data;
}

async function listTemplates() {
  const { graphRoot, accessToken, wabaId } = cfg();
  const { data } = await api.get(`${graphRoot}/${wabaId}/message_templates`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { limit: 200, fields: 'id,name,language,status,category,quality_score,rejected_reason' },
  });
  return data;
}

async function getTemplateById(id) {
  const { graphRoot, accessToken } = cfg();
  const { data } = await api.get(`${graphRoot}/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { fields: 'id,name,language,status,category,quality_score,rejected_reason' },
  });
  return data;
}

/**
 * Resumable upload for template media headers.
 * Returns a media handle (`h:...`) that you can include in the template's HEADER component example.
 *   1. Create upload session: POST {app_id}/uploads?file_length=&file_type=
 *   2. Stream file bytes to /{upload_id}
 *   3. Returns { h: '<handle>' }
 */
async function uploadTemplateMedia(buffer, { fileType = 'image/jpeg' } = {}) {
  const { accessToken, appId, graphVersion } = cfg();
  if (!appId) throw new Error('META_APP_ID required for template media upload');
  // 1. Create upload session
  const sessionResp = await api.post(
    `https://graph.facebook.com/${graphVersion}/${appId}/uploads`,
    null,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { file_length: buffer.length, file_type: fileType },
    }
  );
  const uploadId = sessionResp.data.id; // upload:XXXX
  // 2. Stream bytes
  const { data } = await api.post(
    `https://graph.facebook.com/${graphVersion}/${uploadId}`,
    buffer,
    {
      headers: {
        Authorization: `OAuth ${accessToken}`,
        file_offset: 0,
        'Content-Type': fileType,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );
  return data; // { h: '4::....' }
}

module.exports = {
  cfg,
  sendText,
  sendImage,
  sendDocument,
  sendCtaUrl,
  sendLocationRequest,
  sendContact,
  downloadMedia,
  sendFlowMessage,
  sendTemplate,
  sendOtpTemplate,
  createFlow,
  updateFlowJSON,
  publishFlow,
  setFlowEndpoint,
  uploadBusinessPublicKey,
  createTemplate,
  deleteTemplate,
  listTemplates,
  getTemplateById,
  uploadTemplateMedia,
};
