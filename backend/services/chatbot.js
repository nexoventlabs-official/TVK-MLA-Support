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
 * Send the grievance flow message: image header + body + footer + CTA "Choose Service".
 * Used for users who have already completed registration.
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
    headerText: !banner ? 'TVK Mylapore Grievance' : undefined,
    bodyText:
      'Vanakkam 🙏\n\nWelcome to *TVK Mylapore Legislative Assembly Grievance Service*. Tap *Choose Service* below to raise a grievance for Civic Works, Revenue, Health, Education, Ration, Agriculture, Law & Order, Employment or Personal Assistance.',
    footerText: 'TVK – Tamilaga Vettri Kazhagam',
    flowToken: `welcome_${phone}`,
    mode,
  });
}

/**
 * Send the voter-registration flow message — first-time greeting for any
 * contact whose Member record has `isRegistered=false`. Reuses the same
 * banner image as the grievance flow.
 */
async function sendRegistrationFlow(phone) {
  const flowId = process.env.WHATSAPP_REG_FLOW_ID;
  if (!flowId) {
    // Registration flow not configured yet — fall back to grievance flow so
    // the bot keeps working until admin runs the create script.
    return sendWelcomeFlow(phone);
  }

  const banner = await flowImages.getUrl('chat_welcome_header');
  const mode =
    String(process.env.WHATSAPP_REG_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED'
      ? 'published'
      : 'draft';

  await meta.sendFlowMessage(phone, {
    flowId,
    flowCta: 'Register Now',
    headerImageUrl: banner || undefined,
    headerText: !banner ? 'TVK Mylapore Grievance' : undefined,
    bodyText:
      'Vanakkam 🙏\n\nWelcome to *TVK Mylapore Legislative Assembly Grievance Service*. Please register once with your *EPIC (Voter ID)* number to access our services. Tap *Register Now* below.',
    footerText: 'TVK – Tamilaga Vettri Kazhagam',
    flowToken: `reg_${phone}`,
    mode,
  });
}

/**
 * Called when a Flow's terminal screen fires its `complete` action and Meta
 * delivers the resulting `nfm_reply` to the webhook. We use it to send the
 * grievance ("Choose Service") welcome flow automatically right after a user
 * finishes the registration flow, so they don't have to type "hi" again.
 *
 * `flowToken` is the same token the bot set when launching the flow, e.g.
 * `reg_<phone>` for the registration flow.
 */
async function handleFlowComplete({ phone, flowToken }) {
  if (!phone) return;
  await trackInbound({ phone, profileName: '', text: '[flow_complete]' });
  if (typeof flowToken !== 'string' || !flowToken.startsWith('reg_')) return;

  // Verify the user actually registered (vs. just closing the flow part-way)
  // before sending the grievance welcome.
  let registered = false;
  try {
    const m = await Member.findOne({ phone }).lean();
    registered = !!m?.isRegistered;
  } catch (err) {
    console.warn('[chatbot] handleFlowComplete lookup failed:', err.message);
  }
  if (!registered) return;

  try {
    await sendWelcomeFlow(phone);
  } catch (err) {
    console.error(
      '[chatbot] post-registration welcome failed:',
      err.response?.data || err.message
    );
  }
}

async function handleInbound({ phone, profileName, type, text }) {
  await trackInbound({ phone, profileName, text });

  if (isGreeting(text) || !text) {
    let registered = false;
    try {
      const m = await Member.findOne({ phone }).lean();
      registered = !!m?.isRegistered;
    } catch (err) {
      console.warn('[chatbot] member lookup failed:', err.message);
    }
    try {
      if (registered) {
        await sendWelcomeFlow(phone);
      } else {
        await sendRegistrationFlow(phone);
      }
    } catch (err) {
      console.error('[chatbot] sendFlow failed:', err.response?.data || err.message);
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

module.exports = {
  handleInbound,
  handleFlowComplete,
  sendWelcomeFlow,
  sendRegistrationFlow,
  isGreeting,
  trackInbound,
};
