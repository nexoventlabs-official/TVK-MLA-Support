/**
 * One-shot verification of the 2Factor.in OTP path.
 *
 * Usage:
 *   node scripts/test-twofactor-send.js [phone]
 *
 * Defaults to 9940089442. Generates a fresh 6-digit code, calls
 * services/twofactor.sendOtpSms(), prints the response, exits.
 *
 * Requires TWO_FACTOR_API_KEY in backend/.env.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const crypto = require('crypto');
const { sendOtpSms } = require('../services/twofactor');

(async () => {
  const argPhone = process.argv[2] || '9940089442';
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

  console.log('— 2Factor.in send probe —');
  console.log('  to    :', argPhone);
  console.log('  code  :', code, '(plaintext, only logged here in the probe)');
  console.log('  apiKey:', (process.env.TWO_FACTOR_API_KEY || '<missing>').slice(0, 8) + '…');
  if (process.env.TWO_FACTOR_TEMPLATE) {
    console.log('  tmpl  :', process.env.TWO_FACTOR_TEMPLATE);
  } else {
    console.log('  tmpl  : <default>');
  }
  console.log('');

  try {
    const out = await sendOtpSms(argPhone, code);
    console.log('OK accepted by 2Factor:');
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('FAIL', err.message);
    if (err.twofactor) {
      console.error('2factor body:', JSON.stringify(err.twofactor, null, 2));
    } else if (err.cause) {
      console.error('cause:', err.cause?.message || err.cause);
    }
    process.exit(2);
  }
})();
