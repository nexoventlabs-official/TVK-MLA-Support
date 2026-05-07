const mongoose = require('mongoose');

/**
 * Every WhatsApp contact who has ever messaged the bot becomes a Member.
 * Stores phone (E.164 digits, no +), profile name from WhatsApp, message stats.
 * The Members admin page lists these along with a count of service requests submitted.
 */
const MemberSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    profileName: { type: String, default: '' },
    name: { type: String, default: '' },
    email: { type: String, default: '', trim: true, lowercase: true },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    lastMessage: { type: String, default: '' },
    requestCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Member', MemberSchema);
