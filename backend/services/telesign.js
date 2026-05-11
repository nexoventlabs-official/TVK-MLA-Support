/**
 * TeleSign SMS OTP delivery.
 *
 * Wraps the official `telesignenterprisesdk` callback API in a Promise so the
 * portal route can await it like any other async I/O. Function shape mirrors
 * `metaCloud.sendOtpText` so dispatchOtp() can switch providers via env flag
 * without altering the rest of the route.
 *
 * Credentials come from env vars: TELESIGN_CUSTOMER_ID / TELESIGN_API_KEY.
 * Set TELESIGN_SENDER_ID if you have a registered sender on the account.
 */
const TelesignSDK = require('telesignenterprisesdk');

let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const customerId = process.env.TELESIGN_CUSTOMER_ID;
  const apiKey = process.env.TELESIGN_API_KEY;
  if (!customerId || !apiKey) {
    const e = new Error(
      'TELESIGN_CUSTOMER_ID / TELESIGN_API_KEY are not set. ' +
      'Add them to backend/.env to use the telesign provider.'
    );
    e.code = 'TELESIGN_NO_KEY';
    throw e;
  }
  cachedClient = new TelesignSDK(customerId, apiKey);
  return cachedClient;
}

/**
 * TeleSign accepts these as "delivered to carrier" / OK on the verify/sms
 * endpoint. Anything else we treat as a hard failure.
 *  290 — Message in progress (queued for delivery)
 *  200 — Success
 *  291/292 — Delivered to gateway (some routes)
 */
const ACCEPTED_STATUS_CODES = new Set([200, 290, 291, 292]);

/**
 * Send an OTP code over SMS.
 * @param {string} e164  Recipient phone in E.164 digits, no '+' (e.g. "919940089442").
 * @param {string} code  Plaintext OTP. Caller must already have stored its
 *                       salted hash in OtpCode.
 * @returns {Promise<{ provider: 'telesign', referenceId: string|null, status: object, raw: object }>}
 */
function sendOtpSms(e164, code) {
  return new Promise((resolve, reject) => {
    const client = getClient();
    const params = {
      verify_code: String(code),
      // TeleSign requires a sender_id field even when not using a custom one.
      // The literal string "undefined" is what their docs recommend for the
      // shared shortcode pool — verified in the user's reference snippet.
      sender_id: process.env.TELESIGN_SENDER_ID || 'undefined',
    };

    client.verify.sms(
      (error, body) => {
        if (error) {
          // Network or auth-level failure — never reached the API.
          const e = new Error(typeof error === 'string' ? error : (error.message || 'TeleSign request failed'));
          e.cause = error;
          return reject(e);
        }

        const code = body?.status?.code;
        if (!ACCEPTED_STATUS_CODES.has(code)) {
          const desc = body?.status?.description || `TeleSign rejected SMS (status ${code})`;
          const e = new Error(desc);
          e.telesign = body;
          return reject(e);
        }

        resolve({
          provider: 'telesign',
          referenceId: body.reference_id || null,
          status: body.status,
          raw: body,
        });
      },
      e164,
      params
    );
  });
}

module.exports = { sendOtpSms };
