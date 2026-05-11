/**
 * One-shot verification of the TeleSign OTP path.
 *
 * Usage:
 *   node scripts/test-telesign-send.js [phone]
 *
 * Defaults to 9940089442. Generates a fresh 6-digit code, calls
 * services/telesign.sendOtpSms(), prints the response, exits.
 *
 * This intentionally does NOT touch Mongo or the OtpCode collection — it's a
 * pure integration probe so you can confirm SMS delivery before plugging the
 * route end-to-end.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const crypto = require('crypto');
const { sendOtpSms } = require('../services/telesign');

function normaliseIN(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith('91')) return d;
  if (d.length === 13 && d.startsWith('091')) return d.slice(1);
  return null;
}

(async () => {
  const argPhone = process.argv[2] || '9940089442';
  const e164 = normaliseIN(argPhone);
  if (!e164) {
    console.error(`Could not normalise "${argPhone}" to E.164.`);
    process.exit(1);
  }

  // Match the OtpCode model's 6-digit padded code so the wire format on
  // production matches what users will actually see.
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

  console.log('— TeleSign send probe —');
  console.log('  to    :', e164);
  console.log('  code  :', code, '(plaintext, only logged here in the probe)');
  console.log('  cust  :', (process.env.TELESIGN_CUSTOMER_ID || '<fallback>').slice(0, 8) + '…');
  console.log('');

  try {
    const out = await sendOtpSms(e164, code);
    console.log('OK accepted by TeleSign:');
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('FAIL', err.message);
    if (err.telesign) {
      console.error('telesign body:', JSON.stringify(err.telesign, null, 2));
    } else if (err.cause) {
      console.error('cause:', err.cause);
    }
    process.exit(2);
  }
})();
