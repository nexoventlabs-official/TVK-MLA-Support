/**
 * Re-publish an existing flow (after the initial publish failed because the
 * server didn't yet have FLOW_PRIVATE_KEY loaded).
 *
 * Usage: node scripts/publish-flow.js
 */
require('dotenv').config();
const meta = require('../services/metaCloud');
const { setKeys } = require('./_envFile');

(async () => {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    console.error('❌ WHATSAPP_FLOW_ID is empty in .env');
    process.exit(1);
  }
  try {
    await meta.publishFlow(flowId);
    setKeys({ WHATSAPP_FLOW_STATUS: 'PUBLISHED' });
    console.log(`✅ Flow ${flowId} published`);
  } catch (err) {
    console.error('❌ publish failed:', err.response?.data || err.message);
    process.exit(1);
  }
})();
