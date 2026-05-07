/**
 * Generate an RSA-2048 keypair for WhatsApp Flow encryption.
 * Writes flow_keys/private.pem + flow_keys/public.pem and updates .env with
 * FLOW_PRIVATE_KEY / FLOW_PUBLIC_KEY (newlines escaped as \n).
 *
 * Usage: npm run flow:keys
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { setKeys } = require('./_envFile');

const outDir = path.join(__dirname, '..', 'flow_keys');
fs.mkdirSync(outDir, { recursive: true });

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(path.join(outDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(outDir, 'public.pem'), publicKey);

const escape = (s) => s.replace(/\r?\n/g, '\\n').trim();
setKeys({
  FLOW_PRIVATE_KEY: escape(privateKey),
  FLOW_PUBLIC_KEY: escape(publicKey),
});

console.log('✅ Keys generated in flow_keys/ and saved to .env');
console.log('Now run:  npm run flow:upload-key');
