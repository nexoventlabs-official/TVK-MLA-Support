const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * One-time codes issued for the citizen web portal.
 *
 * The code itself is never stored in plaintext — we keep a SHA-256 hash with a
 * per-row salt so a Mongo dump can't be replayed. Documents auto-expire via a
 * TTL index, and an `attempts` counter caps brute-force guesses.
 *
 * `purpose` ('login' or 'register') lets us tell the user why a code didn't
 * verify (e.g. "this number is already registered, please log in instead").
 */
const OtpCodeSchema = new mongoose.Schema(
  {
    phone:     { type: String, required: true, index: true },   // E.164 digits, no '+'
    purpose:   { type: String, enum: ['login', 'register'], required: true },
    salt:      { type: String, required: true },
    codeHash:  { type: String, required: true },
    attempts:  { type: Number, default: 0 },
    consumed:  { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL
  },
  { versionKey: false }
);

OtpCodeSchema.statics.hashCode = function hashCode(code, salt) {
  return crypto.createHash('sha256').update(`${salt}::${code}`).digest('hex');
};

OtpCodeSchema.statics.generateCode = function generateCode() {
  // 6-digit numeric code, no leading-zero stripping by the WhatsApp client.
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
};

OtpCodeSchema.methods.matches = function matches(code) {
  return this.codeHash === this.constructor.hashCode(code, this.salt);
};

module.exports = mongoose.model('OtpCode', OtpCodeSchema);
