/**
 * Push the latest local Flow JSON (services/flowJson.js) to Meta for the
 * existing flow, then republish so end-users see the new screens.
 *
 * Usage: npm run flow:update   (or)   node scripts/update-flow.js
 */
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildFlowJSON } = require('../services/flowJson');
const { setKeys } = require('./_envFile');

(async () => {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    console.error('❌ WHATSAPP_FLOW_ID is empty in .env');
    process.exit(1);
  }
  try {
    console.log(`• Uploading flow JSON to ${flowId}…`);
    await meta.updateFlowJSON(flowId, buildFlowJSON());
    console.log('✅ Flow JSON uploaded');
  } catch (err) {
    console.error('❌ upload failed:', err.response?.data || err.message);
    process.exit(1);
  }

  try {
    console.log('• Publishing…');
    await meta.publishFlow(flowId);
    setKeys({ WHATSAPP_FLOW_STATUS: 'PUBLISHED' });
    console.log(`✅ Flow ${flowId} published`);
  } catch (err) {
    const detail = err.response?.data?.error || err.message;
    console.warn('⚠️  publish failed (kept as DRAFT):', detail);
    setKeys({ WHATSAPP_FLOW_STATUS: 'DRAFT' });
  }
})();
