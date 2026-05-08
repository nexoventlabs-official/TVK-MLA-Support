const express = require('express');
const crypto = require('crypto');
const chatbot = require('../services/chatbot');

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

          if (msg.type === 'text') text = msg.text?.body || '';
          else if (msg.type === 'interactive') {
            // Flow `complete` callbacks arrive as interactive.nfm_reply.
            // We forward them to handleFlowComplete so the bot can send the
            // grievance "Choose Service" welcome flow automatically right
            // after the user finishes the registration flow.
            if (msg.interactive?.type === 'nfm_reply') {
              const respJson = msg.interactive?.nfm_reply?.response_json || '';
              let flowToken = '';
              try {
                const parsed = respJson ? JSON.parse(respJson) : {};
                flowToken = parsed.flow_token || '';
              } catch (e) {
                console.warn('[webhook] nfm_reply parse failed:', e.message);
              }
              await chatbot
                .handleFlowComplete({ phone: from, flowToken })
                .catch((e) =>
                  console.error('[webhook] handleFlowComplete failed:', e.message)
                );
              continue;
            }
            text = msg.interactive?.button_reply?.title ||
              msg.interactive?.list_reply?.title || '';
          } else if (msg.type === 'button') {
            text = msg.button?.text || '';
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
