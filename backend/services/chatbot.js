const meta = require('./metaCloud');
const flowImages = require('./flowImages');
const Member = require('../models/Member');

const GREETING_RE = /^(hi+|h?ello+|hey+|namaste|namaskar|namaskaram|vanakkam|start|menu|services|help)\b/i;

function isGreeting(text) {
  if (!text) return false;
  const t = String(text).trim();
  if (!t) return false;
  return GREETING_RE.test(t);
}

/** Track every contact who messages the bot (used for Members admin page + campaigns broadcast list). */
async function trackInbound({ phone, profileName, text }) {
  if (!phone) return;
  try {
    await Member.findOneAndUpdate(
      { phone },
      {
        $setOnInsert: { firstSeenAt: new Date(), phone },
        $set: {
          profileName: profileName || '',
          lastSeenAt: new Date(),
          lastMessage: (text || '').slice(0, 500),
        },
        $inc: { messageCount: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.warn('[chatbot] trackInbound failed:', err.message);
  }
}

/**
 * Send the welcome flow message: image header + body + footer + CTA "Choose Service".
 */
async function sendWelcomeFlow(phone) {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    await meta.sendText(
      phone,
      'Welcome to TVK 🇮🇳\n\nOur grievance flow is being set up. Please try again soon.'
    );
    return;
  }

  const banner = await flowImages.getUrl('chat_welcome_header');
  const mode =
    String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED'
      ? 'published'
      : 'draft';

  await meta.sendFlowMessage(phone, {
    flowId,
    flowCta: 'Choose Service',
    headerImageUrl: banner || undefined,
    headerText: !banner ? 'TVK Public Grievance' : undefined,
    bodyText:
      'Vanakkam 🙏\n\nWelcome to *TVK Public Grievance Service*. Tap *Choose Service* below to raise a grievance for Civic Works, Revenue, Health, Education, Ration, Agriculture, Law & Order, Employment or Personal Assistance.',
    footerText: 'TVK – Tamilaga Vettri Kazhagam',
    flowToken: `welcome_${phone}`,
    mode,
  });
}

async function handleInbound({ phone, profileName, type, text }) {
  await trackInbound({ phone, profileName, text });

  if (isGreeting(text) || !text) {
    try {
      await sendWelcomeFlow(phone);
    } catch (err) {
      console.error('[chatbot] sendWelcomeFlow failed:', err.response?.data || err.message);
      await meta
        .sendText(phone, 'Welcome to TVK 🇮🇳 — please type *hi* to see our services.')
        .catch(() => {});
    }
    return;
  }

  await meta
    .sendText(phone, 'Vanakkam 🙏\n\nType *hi* to open the menu and choose a service.')
    .catch(() => {});
}

module.exports = { handleInbound, sendWelcomeFlow, isGreeting, trackInbound };
