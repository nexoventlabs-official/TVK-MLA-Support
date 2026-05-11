/**
 * 2Factor.in SMS OTP delivery (custom-OTP route).
 *
 * We pass our own OTP code (already hashed + persisted in OtpCode) through
 * 2Factor's "transactional SMS with custom OTP" endpoint:
 *
 *   GET https://2factor.in/API/V1/{API_KEY}/SMS/{PHONE}/{OTP}
 *   GET https://2factor.in/API/V1/{API_KEY}/SMS/{PHONE}/{OTP}/{TEMPLATE}
 *
 * - No template name → 2Factor uses the account's default template.
 * - The free tier ships an `OTP1` template which sends:
 *     "Dear Customer, Your OTP is {OTP}. Please do not share this OTP."
 *
 * If the account has a DLT-approved template uploaded, set
 * TWO_FACTOR_TEMPLATE in env to its name and that will be used instead.
 *
 * Response shape on success:
 *   { Status: "Success", Details: "<session_id>" }
 * On failure 2Factor still returns HTTP 200 but with:
 *   { Status: "Error", Details: "<reason>" }
 */
const axios = require('axios');

const BASE_URL = 'https://2factor.in/API/V1';

function getApiKey() {
  const key = process.env.TWO_FACTOR_API_KEY;
  if (!key) {
    const e = new Error(
      'TWO_FACTOR_API_KEY is not set. Sign up at https://2factor.in, ' +
      'grab the key from the API page, and add it to backend/.env'
    );
    e.code = 'TWOFACTOR_NO_KEY';
    throw e;
  }
  return key;
}

/**
 * Strip any input down to a 10-digit Indian mobile. 2Factor accepts E.164 too
 * (with or without leading '+'), but the 10-digit Indian form is what their
 * default templates are tuned for.
 */
function toIndianMobile(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return d;
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  if (d.length === 13 && d.startsWith('091')) return d.slice(3);
  throw new Error(`Cannot extract 10-digit Indian mobile from "${phone}"`);
}

/**
 * Send our own pre-generated OTP via 2Factor SMS.
 *
 * @param {string} phone  E.164 (e.g. "919940089442") or 10-digit Indian mobile.
 * @param {string} code   Plaintext OTP (the same string we hashed into OtpCode).
 * @returns {Promise<{ provider: 'twofactor', referenceId: string|null, raw: object }>}
 */
async function sendOtpSms(phone, code) {
  const apiKey = getApiKey();
  const numbers = toIndianMobile(phone);
  const otp = String(code).trim();
  if (!otp) throw new Error('OTP code is empty');

  const template = process.env.TWO_FACTOR_TEMPLATE || ''; // empty → default template

  const path = template
    ? `${BASE_URL}/${apiKey}/SMS/${numbers}/${encodeURIComponent(otp)}/${encodeURIComponent(template)}`
    : `${BASE_URL}/${apiKey}/SMS/${numbers}/${encodeURIComponent(otp)}`;

  let response;
  try {
    response = await axios.get(path, {
      timeout: 10_000,
      validateStatus: () => true,
    });
  } catch (err) {
    const e = new Error(`2Factor request failed: ${err.message}`);
    e.cause = err;
    throw e;
  }

  const body = response.data || {};
  const okStatus = String(body.Status || '').toLowerCase();

  if (response.status >= 400 || okStatus !== 'success') {
    const detail = body.Details || `HTTP ${response.status}`;
    const e = new Error(`2Factor rejected SMS: ${detail}`);
    e.twofactor = body;
    throw e;
  }

  return {
    provider: 'twofactor',
    referenceId: body.Details || null, // 2Factor session id, used to verify too
    raw: body,
  };
}

module.exports = { sendOtpSms };
