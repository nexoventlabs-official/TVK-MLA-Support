/**
 * Webhook-side state machine for the "share location → upload photos → create
 * ticket" branches of the grievance flow.
 *
 * Triggered from `routes/webhook.js` whenever an inbound message arrives:
 *   - location message  → handleLocationMessage()
 *   - image message     → handleImageMessage()
 *   - text message      → handleTextDuringPending() ("done", "cancel", etc.)
 *
 * The `Member.pendingAction` sub-doc carries the state. It is populated by
 * `postActionDispatcher.startLocationFlow()` after the user closes the flow,
 * and is cleared once the ticket is created (or on idle expiry).
 */

const meta = require('./metaCloud');
const flowImages = require('./flowImages');
const cloudinary = require('./cloudinary');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');
const { getAction } = require('./issueActions');
const { generateTicketId } = require('./ticketing');
const { sendWelcomeFlowSafe } = require('./postActionDispatcher');

const MAX_PHOTOS = 3;

/* ───────────────── public entry points ───────────────── */

async function loadPendingMember(phone) {
  if (!phone) return null;
  const member = await Member.findOne({ phone });
  if (!member?.pendingAction || !member.pendingAction.kind) return null;
  // Auto-expire idle state machines.
  if (member.pendingAction.expiresAt && member.pendingAction.expiresAt < new Date()) {
    member.pendingAction = null;
    await member.save();
    return null;
  }
  return member;
}

async function handleLocationMessage({ phone, locationData }) {
  const member = await loadPendingMember(phone);
  if (!member) return false;
  const pa = member.pendingAction;
  if (pa.step !== 'awaiting_location') {
    await meta
      .sendText(
        phone,
        '📍 We already have your location for this ticket. Please continue with the next step.'
      )
      .catch(() => {});
    return true;
  }

  const lat = Number(locationData?.latitude);
  const lng = Number(locationData?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    await meta
      .sendText(phone, '❌ Invalid location. Please share your *current location* again.')
      .catch(() => {});
    return true;
  }

  pa.geo = {
    latitude: lat,
    longitude: lng,
    name: locationData?.name || '',
    address: locationData?.address || '',
  };

  if (pa.kind === 'location_only_ticket') {
    // No photos required → finalise the ticket immediately.
    await finaliseTicket(member);
    return true;
  }

  // location_photos_ticket: ask for photos.
  pa.step = 'awaiting_photos';
  pa.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  member.markModified('pendingAction');
  await member.save();

  await meta
    .sendText(
      phone,
      `✅ Location received.\n\n📸 Now please send *1 to ${MAX_PHOTOS} photos* of the *${pa.optionTitle}*.\n` +
        'Reply *done* once you have sent all photos.'
    )
    .catch(() => {});
  return true;
}

async function handleImageMessage({ phone, mediaId }) {
  const member = await loadPendingMember(phone);
  if (!member) return false;
  const pa = member.pendingAction;
  if (pa.step !== 'awaiting_photos') {
    await meta
      .sendText(
        phone,
        '📸 Photos are not expected at this step. Please share your *current location* first.'
      )
      .catch(() => {});
    return true;
  }
  if (pa.mediaUrls.length >= MAX_PHOTOS) {
    await meta
      .sendText(
        phone,
        `📸 We already have ${MAX_PHOTOS} photos for this ticket. Reply *done* to submit.`
      )
      .catch(() => {});
    return true;
  }

  let uploadedUrl = '';
  try {
    const { buffer } = await meta.downloadMedia(mediaId);
    const up = await cloudinary.uploadBuffer(buffer, { folder: `tvk/tickets/${pa.serviceId}/${pa.optionId}` });
    uploadedUrl = up.secure_url;
  } catch (err) {
    console.error('[pendingActionHandler] photo upload failed:', err.response?.data || err.message);
    await meta
      .sendText(phone, '❌ Could not save that photo. Please try sending it again.')
      .catch(() => {});
    return true;
  }

  pa.mediaUrls.push(uploadedUrl);
  pa.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  member.markModified('pendingAction');
  await member.save();

  const have = pa.mediaUrls.length;
  if (have >= MAX_PHOTOS) {
    // Auto-finalise after the 3rd photo.
    await finaliseTicket(member);
    return true;
  }
  await meta
    .sendText(
      phone,
      `✅ Photo ${have} of up to ${MAX_PHOTOS} received.\n\n` +
        'Send another photo or reply *done* to submit.'
    )
    .catch(() => {});
  return true;
}

/**
 * Called by the webhook when the user types text during a pending action.
 * Returns true if the text was consumed (so the regular chatbot greeter
 * should NOT also handle it).
 */
async function handleTextDuringPending({ phone, text }) {
  const member = await loadPendingMember(phone);
  if (!member) return false;
  const pa = member.pendingAction;
  const t = String(text || '').trim().toLowerCase();

  if (t === 'cancel' || t === 'stop') {
    member.pendingAction = null;
    await member.save();
    await meta.sendText(phone, '❌ Cancelled. Type *hi* anytime to start again.').catch(() => {});
    return true;
  }

  if (pa.step === 'awaiting_location') {
    await meta
      .sendText(
        phone,
        '📍 We are still waiting for your *location*. Tap 📎 → *Location* → *Send your current location*.\n\n' +
          'Or reply *cancel* to abort.'
      )
      .catch(() => {});
    return true;
  }

  if (pa.step === 'awaiting_photos') {
    if (t === 'done' || t === 'finish' || t === 'submit') {
      if (pa.mediaUrls.length === 0) {
        await meta
          .sendText(phone, '📸 Please send at least one photo before submitting.')
          .catch(() => {});
        return true;
      }
      await finaliseTicket(member);
      return true;
    }
    await meta
      .sendText(
        phone,
        `📸 Send up to ${MAX_PHOTOS} photos of the *${pa.optionTitle}*, or reply *done* when finished.`
      )
      .catch(() => {});
    return true;
  }

  return false;
}

/* ───────────────── ticket finalisation ───────────────── */

async function finaliseTicket(member) {
  const pa = member.pendingAction;
  if (!pa) return;
  const phone = member.phone;
  const action = getAction(pa.serviceId, pa.optionId);

  let ticketId = pa.ticketId;
  if (!ticketId) ticketId = await generateTicketId();

  try {
    await ServiceRequest.create({
      ticketId,
      phone,
      name: member.name || member.profileName || '',
      serviceId: pa.serviceId,
      serviceTitle: pa.serviceTitle,
      optionId: pa.optionId,
      optionTitle: pa.optionTitle,
      description: '',
      location: pa.geo?.address || '',
      geo: pa.geo || null,
      mediaUrls: pa.mediaUrls || [],
      status: 'pending',
    });
  } catch (err) {
    console.error('[pendingActionHandler] ticket create failed:', err.message);
    await meta
      .sendText(phone, 'Could not save your ticket right now. Please try again later.')
      .catch(() => {});
    return;
  }

  member.requestCount = (member.requestCount || 0) + 1;
  member.pendingAction = null;
  await member.save();

  // Confirmation message: header image + ticket id + body, then re-launch
  // the welcome flow as the "Choose Service" CTA.
  const banner =
    (action?.headerKey && (await flowImages.getUrl(action.headerKey))) ||
    (await flowImages.getUrl('chat_welcome_header'));

  const body =
    `🙏 *Ticket Generated*\n\n` +
    `Ticket ID: *${ticketId}*\n` +
    `Service: ${pa.serviceTitle}\n` +
    `Issue: ${pa.optionTitle}\n` +
    `Status: *Pending*\n\n` +
    'Our team will review your request and update you here. ' +
    'Tap *Choose Service* below to raise another grievance.';

  await sendWelcomeFlowSafe(phone, { body, banner });
}

module.exports = {
  handleLocationMessage,
  handleImageMessage,
  handleTextDuringPending,
  loadPendingMember,
};
