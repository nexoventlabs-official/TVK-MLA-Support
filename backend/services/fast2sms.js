/**
 * Fast2SMS OTP delivery (Quick OTP route — no DLT registration required).
 *
 * Why this route?
 *   Fast2SMS exposes three routes: `dlt` (needs DLT template approval),
 *   `q` (Quick SMS, custom message), and `otp` (fixed format "Your OTP: ...",
 *   bypasses DLT entirely). For a citizen-portal verification flow the OTP
 *   route is the right pick — instant onboarding, no template paperwork.
 *
 * API
 *   GET https://www.fast2sms.com/dev/bulkV2
 *     ?authorization=<API_KEY>
 *     &variables_values=<otp_code>
 *     &route=otp
 *     &numbers=<10_digit_indian_mobile>
 *   Recipient receives:  "<otp> is your OTP. Please do not share it."
 *
 * Credentials: FAST2SMS_API_KEY env var (required).
 */
const axios = require('axios');

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

function getApiKey() {
  const key = process.env.FAST2SMS_API_KEY;
  if (!key) {
    const e = new Error(
      'FAST2SMS_API_KEY is not set. Sign up at https://www.fast2sms.com, ' +
      'grab the key from Dev API page, and add it to backend/.env'
    );
    e.code = 'FAST2SMS_NO_KEY';
    throw e;
  }
  return key;
}

/**
 * Strip an Indian E.164 phone (e.g. "919940089442") down to the 10-digit
 * subscriber number Fast2SMS expects ("9940089442"). Pass-through if the
 * input is already 10 digits.
 */
function toIndianMobile(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return d;
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  if (d.length === 13 && d.startsWith('091')) return d.slice(3);
  throw new Error(`Cannot extract 10-digit Indian mobile from "${phone}"`);
}

/**
 * Send an OTP code over SMS via Fast2SMS Quick OTP route.
 *
 * @param {string} phone  E.164 (e.g. "919940089442") or 10-digit Indian mobile.
 * @param {string} code   Plaintext OTP (digits only — Fast2SMS OTP route only
 *                        accepts numeric `variables_values`).
 * @returns {Promise<{ provider: 'fast2sms', referenceId: string|null, raw: object }>}
 */
async function sendOtpSms(phone, code) {
  const apiKey = getApiKey();
  const numbers = toIndianMobile(phone);
  const otp = String(code).replace(/\D/g, '');
  if (!otp) throw new Error('OTP code must contain digits for Fast2SMS OTP route');

  const params = {
    authorization: apiKey,
    variables_values: otp,
    route: 'otp',
    numbers,
  };

  let response;
  try {
    response = await axios.get(FAST2SMS_URL, {
      params,
      timeout: 10_000,
      validateStatus: () => true, // we'll inspect body shape ourselves
    });
  } catch (err) {
    const e = new Error(`Fast2SMS request failed: ${err.message}`);
    e.cause = err;
    throw e;
  }

  const body = response.data || {};

  // Fast2SMS uses { return: true, request_id, message: [...] } on success
  // and { return: false, status_code, message } on failure (the message can
  // be a string or an array — handle both).
  if (response.status >= 400 || body.return === false) {
    const msg = Array.isArray(body.message) ? body.message.join('; ') : (body.message || `HTTP ${response.status}`);
    const e = new Error(`Fast2SMS rejected SMS: ${msg}`);
    e.fast2sms = body;
    throw e;
  }

  return {
    provider: 'fast2sms',
    referenceId: body.request_id || null,
    raw: body,
  };
}

module.exports = { sendOtpSms };
