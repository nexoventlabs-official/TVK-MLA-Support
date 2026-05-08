const express = require('express');
const crypto = require('crypto');
const chatbot = require('../services/chatbot');
const postActionDispatcher = require('../services/postActionDispatcher');
const pendingActionHandler = require('../services/pendingActionHandler');

const router = express.Router();

/* ─── Webhook verification (Meta GET) ─── */
router.get('/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (!verifyToken) return res.sendStatus(500);

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  if (!mode && !token) {
    return res.json({ status: 'webhook active' });
  }
  return res.sendStatus(403);
});

/* ─── Signature verification ─── */
function verifySignature(req) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/* ─── Webhook receiver (Meta POST) ─── */
router.post('/meta', async (req, res) => {
  // Acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  if (process.env.META_APP_SECRET && !verifySignature(req)) {
    console.warn('[webhook] invalid signature');
    return;
  }

  try {
    const body = req.body || {};
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        // Template status updates land here too — handle them below.
        if (change.field === 'message_template_status_update') {
          await handleTemplateStatusUpdate(change.value).catch((e) =>
            console.warn('[webhook] template status update failed:', e.message)
          );
          continue;
        }

        const value = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          const from = msg.from;
          const profileName = contacts[0]?.profile?.name || '';
          let text = '';
          let type = msg.type;

          // ─── Location messages (state machine for grievance flow) ───
          if (msg.type === 'location') {
            const locationData = {
              latitude: msg.location?.latitude,
              longitude: msg.location?.longitude,
              name: msg.location?.name || '',
              address: msg.location?.address || '',
            };
            await chatbot
              .trackInbound({ phone: from, profileName, text: '[location]' })
              .catch(() => {});
            const handled = await pendingActionHandler
              .handleLocationMessage({ phone: from, locationData })
              .catch((e) => {
                console.error('[webhook] location handler failed:', e.message);
                return false;
              });
            if (!handled) {
              // No pending action: ignore the location silently. The bot
              // never asks for a location outside an active state machine.
            }
            continue;
          }

          // ─── Image messages (photo upload during awaiting_photos) ───
          if (msg.type === 'image') {
            const mediaId = msg.image?.id;
            await chatbot
              .trackInbound({ phone: from, profileName, text: '[image]' })
              .catch(() => {});
            if (mediaId) {
              await pendingActionHandler
                .handleImageMessage({ phone: from, mediaId })
                .catch((e) =>
                  console.error('[webhook] image handler failed:', e.message)
                );
            }
            continue;
          }

          if (msg.type === 'text') text = msg.text?.body || '';
          else if (msg.type === 'interactive') {
            // Flow `complete` callbacks arrive as interactive.nfm_reply.
            // Two reasons we forward them:
            //   1. Registration flow `reg_<phone>` token  → handleFlowComplete
            //      sends the grievance welcome flow next.
            //   2. Welcome flow `welcome_<phone>` token   → the INFO terminal
            //      screen carries `post_action` + `post_data_b64` which the
            //      postActionDispatcher decodes to fire URL / PDF / location
            //      / ticket follow-up messages.
            if (msg.interactive?.type === 'nfm_reply') {
              const respJson = msg.interactive?.nfm_reply?.response_json || '';
              let flowToken = '';
              let postAction = '';
              let postDataB64 = '';
              try {
                const parsed = respJson ? JSON.parse(respJson) : {};
                flowToken = parsed.flow_token || '';
                postAction = parsed.post_action || '';
                postDataB64 = parsed.post_data_b64 || '';
              } catch (e) {
                console.warn('[webhook] nfm_reply parse failed:', e.message);
              }
              await chatbot
                .trackInbound({ phone: from, profileName, text: '[flow_complete]' })
                .catch(() => {});

              // (1) Registration flow finished → grievance welcome.
              await chatbot
                .handleFlowComplete({ phone: from, flowToken })
                .catch((e) =>
                  console.error('[webhook] handleFlowComplete failed:', e.message)
                );

              // (2) Welcome flow finished WITH a post_action → dispatch.
              if (postAction) {
                await postActionDispatcher
                  .dispatch({ phone: from, postAction, postDataB64 })
                  .catch((e) =>
                    console.error('[webhook] postAction dispatch failed:', e.message)
                  );
              }
              continue;
            }
            text = msg.interactive?.button_reply?.title ||
              msg.interactive?.list_reply?.title || '';
          } else if (msg.type === 'button') {
            text = msg.button?.text || '';
          }

          // ─── Text input during a pending action takes priority ───
          if (msg.type === 'text') {
            const consumed = await pendingActionHandler
              .handleTextDuringPending({ phone: from, text })
              .catch((e) => {
                console.error('[webhook] pending text handler failed:', e.message);
                return false;
              });
            if (consumed) {
              await chatbot
                .trackInbound({ phone: from, profileName, text })
                .catch(() => {});
              continue;
            }
          }

          await chatbot.handleInbound({ phone: from, profileName, type, text });
        }
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err.message);
  }
});

async function handleTemplateStatusUpdate(value) {
  if (!value || !value.message_template_id) return;
  const Campaign = require('../models/Campaign');
  const update = {
    status: String(value.event || value.message_template_status || '').toUpperCase() || 'PENDING',
    rejectionReason: value.reason || '',
    lastSyncedAt: new Date(),
  };
  await Campaign.updateOne(
    { metaTemplateId: String(value.message_template_id) },
    { $set: update }
  );
}

module.exports = router;
