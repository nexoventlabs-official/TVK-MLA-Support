/**
 * Create + publish the TVK Voter Registration flow on Meta.
 *
 * Usage: npm run reg:create
 *
 * Writes WHATSAPP_REG_FLOW_ID and WHATSAPP_REG_FLOW_STATUS to .env
 * so the chatbot can route first-time users to it.
 */
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildRegistrationFlowJSON } = require('../services/registrationFlowJson');
const { setKeys } = require('./_envFile');

(async () => {
  const backend = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
  if (!backend.startsWith('https://')) {
    console.warn(
      '⚠️  BACKEND_URL is not HTTPS. Meta requires HTTPS for the Flow endpoint. ' +
        'Set BACKEND_URL to your public HTTPS URL before running this script.'
    );
  }

  const endpointUri = `${backend}/api/flow-endpoint`;
  console.log('Creating registration flow with endpoint:', endpointUri);

  let flowId;
  try {
    const res = await meta.createFlow('TVK Voter Registration', ['SIGN_UP'], { endpointUri });
    flowId = res.id;
    console.log('✅ Registration flow created:', flowId);
  } catch (err) {
    // Some WABAs reject the SIGN_UP category — retry with OTHER as a fallback.
    console.warn('⚠️  createFlow with SIGN_UP failed, retrying with OTHER:', err.response?.data || err.message);
    try {
      const res = await meta.createFlow('TVK Voter Registration', ['OTHER'], { endpointUri });
      flowId = res.id;
      console.log('✅ Registration flow created (OTHER):', flowId);
    } catch (err2) {
      console.error('❌ createFlow failed:', err2.response?.data || err2.message);
      process.exit(1);
    }
  }

  try {
    const flowJson = buildRegistrationFlowJSON();
    const res = await meta.updateFlowJSON(flowId, flowJson);
    if (res?.validation_errors?.length) {
      console.warn('⚠️  Validation warnings:', JSON.stringify(res.validation_errors, null, 2));
    } else {
      console.log('✅ Registration flow JSON uploaded');
    }
  } catch (err) {
    console.error('❌ updateFlowJSON failed:', err.response?.data || err.message);
    process.exit(1);
  }

  let status = 'DRAFT';
  try {
    await meta.publishFlow(flowId);
    status = 'PUBLISHED';
    console.log('✅ Registration flow published');
  } catch (err) {
    console.warn(
      '⚠️  publish failed — flow saved as DRAFT. Fix issues in Meta UI then publish manually.\n',
      err.response?.data || err.message
    );
  }

  setKeys({ WHATSAPP_REG_FLOW_ID: flowId, WHATSAPP_REG_FLOW_STATUS: status });
  console.log(`✅ WHATSAPP_REG_FLOW_ID=${flowId}, WHATSAPP_REG_FLOW_STATUS=${status} saved to .env`);
})();
