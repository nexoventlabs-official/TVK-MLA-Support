/**
 * Push the latest local registration flow JSON to Meta and republish.
 *
 * Usage: npm run reg:update
 */
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildRegistrationFlowJSON } = require('../services/registrationFlowJson');
const { setKeys } = require('./_envFile');

(async () => {
  const flowId = process.env.WHATSAPP_REG_FLOW_ID;
  if (!flowId) {
    console.error('❌ WHATSAPP_REG_FLOW_ID is empty in .env. Run `npm run reg:create` first.');
    process.exit(1);
  }
  try {
    console.log(`• Uploading registration flow JSON to ${flowId}…`);
    await meta.updateFlowJSON(flowId, buildRegistrationFlowJSON());
    console.log('✅ Registration flow JSON uploaded');
  } catch (err) {
    console.error('❌ upload failed:', err.response?.data || err.message);
    process.exit(1);
  }

  try {
    console.log('• Publishing…');
    await meta.publishFlow(flowId);
    setKeys({ WHATSAPP_REG_FLOW_STATUS: 'PUBLISHED' });
    console.log(`✅ Registration flow ${flowId} published`);
  } catch (err) {
    const detail = err.response?.data?.error || err.message;
    console.warn('⚠️  publish failed (kept as DRAFT):', detail);
    setKeys({ WHATSAPP_REG_FLOW_STATUS: 'DRAFT' });
  }
})();
