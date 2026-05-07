const mongoose = require('mongoose');

/**
 * Every WhatsApp contact who has ever messaged the bot becomes a Member.
 * Stores phone (E.164 digits, no +), profile name from WhatsApp, message stats,
 * and (after the registration flow completes) voter registration details.
 *
 * `voterSnapshot` is a copy of the matched record from the read-only voter DB
 * at the moment of registration, so admin views remain consistent even if
 * the source roll is later updated.
 */
const VoterSnapshotSchema = new mongoose.Schema(
  {
    voterId: { type: Number, default: null },
    name: { type: String, default: '' },
    epicNo: { type: String, default: '' },
    relationType: { type: String, default: '' },
    relationName: { type: String, default: '' },
    gender: { type: String, default: '' },
    houseNo: { type: String, default: '' },
    mobile: { type: String, default: '' },
    assemblyNo: { type: String, default: '' },
    assemblyName: { type: String, default: '' },
    sourceCollection: { type: String, default: '' },
  },
  { _id: false }
);

const MemberSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    profileName: { type: String, default: '' },
    name: { type: String, default: '' },
    email: { type: String, default: '', trim: true, lowercase: true },
    dob: { type: Date, default: null },
    gender: { type: String, default: '', enum: ['', 'Male', 'Female', 'Other'] },
    epicNo: { type: String, default: '', index: true, uppercase: true, trim: true },
    voterSnapshot: { type: VoterSnapshotSchema, default: null },
    isRegistered: { type: Boolean, default: false, index: true },
    registrationType: {
      type: String,
      enum: ['', 'epic', 'manual'],
      default: '',
    },
    registeredAt: { type: Date, default: null },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    lastMessage: { type: String, default: '' },
    requestCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/** Age (in years) computed from `dob`. */
MemberSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  const now = new Date();
  let age = now.getFullYear() - this.dob.getFullYear();
  const m = now.getMonth() - this.dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < this.dob.getDate())) age--;
  return age >= 0 ? age : null;
});

module.exports = mongoose.model('Member', MemberSchema);
