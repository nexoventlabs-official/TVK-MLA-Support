/**
 * One-shot verification of the Fast2SMS OTP path.
 *
 * Usage:
 *   node scripts/test-fast2sms-send.js [phone]
 *
 * Defaults to 9940089442. Generates a fresh 6-digit code, calls
 * services/fast2sms.sendOtpSms(), prints the response, exits.
 *
 * Requires FAST2SMS_API_KEY in backend/.env. Get one at
 *   https://www.fast2sms.com  → Dev API page after signup.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const crypto = require('crypto');
const { sendOtpSms } = require('../services/fast2sms');

(async () => {
  const argPhone = process.argv[2] || '9940089442';

  // Fast2SMS only accepts numeric OTP via the Quick OTP route.
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

  console.log('— Fast2SMS send probe —');
  console.log('  to    :', argPhone);
  console.log('  code  :', code, '(plaintext, only logged here in the probe)');
  console.log('  apiKey:', (process.env.FAST2SMS_API_KEY || '<missing>').slice(0, 6) + '…');
  console.log('');

  try {
    const out = await sendOtpSms(argPhone, code);
    console.log('OK accepted by Fast2SMS:');
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('FAIL', err.message);
    if (err.fast2sms) {
      console.error('fast2sms body:', JSON.stringify(err.fast2sms, null, 2));
    } else if (err.cause) {
      console.error('cause:', err.cause?.message || err.cause);
    }
    if (err.code === 'FAST2SMS_NO_KEY') {
      console.error('\nHow to fix:');
      console.error('  1. Sign up at https://www.fast2sms.com');
      console.error('  2. Go to Dev API page and copy the API key');
      console.error('  3. Add to backend/.env:  FAST2SMS_API_KEY=<your_key>');
    }
    process.exit(2);
  }
})();
