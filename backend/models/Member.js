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
/**
 * A short-lived state machine attached to a Member that tracks "the user closed
 * a flow and we now expect them to share a location / send photos before we
 * generate a ticket". Cleared once the action completes or `expiresAt` passes.
 *
 * Steps used by the issueActions dispatcher:
 *   awaiting_location  → next location message progresses to awaiting_photos (or completes)
 *   awaiting_photos    → next image messages append to mediaUrls; "done"/2-min idle finalises
 *   done               → terminal (cleared on next greeting / new flow)
 */
const PendingActionSchema = new mongoose.Schema(
  {
    kind: { type: String, default: '' },         // e.g. 'location_photos_ticket'
    serviceId: { type: String, default: '' },
    optionId: { type: String, default: '' },
    serviceTitle: { type: String, default: '' },
    optionTitle: { type: String, default: '' },
    step: { type: String, default: '' },         // 'awaiting_location' | 'awaiting_photos' | 'done'
    minPhotos: { type: Number, default: 0 },
    geo: { type: mongoose.Schema.Types.Mixed, default: null },
    mediaUrls: { type: [String], default: [] },
    ticketId: { type: String, default: '' },     // populated once the ticket row exists
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { _id: false }
);

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
    /**
     * Last time the user sent us an inbound WhatsApp message. Distinct from
     * `lastSeenAt` (which we also bump on portal logins) because the WhatsApp
     * 24-hour customer-service window is keyed on inbound messages only.
     * Used by the portal OTP dispatcher to choose between a free-form text
     * message (in-window, no charge) and a paid AUTHENTICATION template.
     */
    lastInboundAt: { type: Date, default: null },
    messageCount: { type: Number, default: 0 },
    lastMessage: { type: String, default: '' },
    requestCount: { type: Number, default: 0 },
    pendingAction: { type: PendingActionSchema, default: null },
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
