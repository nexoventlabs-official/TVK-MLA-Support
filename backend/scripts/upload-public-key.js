/**
 * Upload the Flow public key to Meta so they can encrypt requests to our endpoint.
 *
 * Usage: npm run flow:upload-key
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const meta = require('../services/metaCloud');

(async () => {
  let publicKey = (process.env.FLOW_PUBLIC_KEY || '').replace(/\\n/g, '\n').trim();
  if (!publicKey) {
    const file = path.join(__dirname, '..', 'flow_keys', 'public.pem');
    if (fs.existsSync(file)) publicKey = fs.readFileSync(file, 'utf8').trim();
  }
  if (!publicKey) {
    console.error('❌ Public key not found. Run `npm run flow:keys` first.');
    process.exit(1);
  }

  try {
    const res = await meta.uploadBusinessPublicKey(publicKey);
    console.log('✅ Public key uploaded to Meta:', res);
  } catch (err) {
    console.error('❌ Upload failed:', err.response?.data || err.message);
    process.exit(1);
  }
})();
