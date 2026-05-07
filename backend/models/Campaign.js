const mongoose = require('mongoose');

/**
 * A Meta WhatsApp message TEMPLATE created via the admin panel.
 * - The admin defines header (image/video/text/document), body, footer, buttons.
 * - We POST to /{waba_id}/message_templates to register it.
 * - Meta returns a templateId and a status (PENDING/APPROVED/REJECTED).
 * - The dashboard/campaigns page polls /{waba_id}/message_templates to surface
 *   the current status in real time.
 * - When APPROVED, admin can `Send` the template to all stored Member contacts.
 */
const ButtonSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'], required: true },
    text: { type: String, required: true },
    url: { type: String, default: '' },          // for URL CTA
    phone_number: { type: String, default: '' },  // for PHONE_NUMBER CTA
  },
  { _id: false }
);

const SendStatSchema = new mongoose.Schema(
  {
    sentAt: { type: Date, default: Date.now },
    total: { type: Number, default: 0 },
    success: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { _id: false }
);

const CampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // template name (snake_case_lower)
    language: { type: String, default: 'en_US' },
    category: { type: String, enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'], default: 'MARKETING' },

    // Header: text | image | video | document | none
    headerType: { type: String, enum: ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'], default: 'NONE' },
    headerText: { type: String, default: '' },
    headerMediaUrl: { type: String, default: '' },     // Cloudinary public URL for the sample upload
    headerMediaPublicId: { type: String, default: '' },
    headerHandle: { type: String, default: '' },        // Meta media handle returned by /uploads (h:xxxxx)

    bodyText: { type: String, required: true },
    footerText: { type: String, default: '' },

    buttons: { type: [ButtonSchema], default: [] },

    metaTemplateId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED', 'IN_APPEAL'],
      default: 'DRAFT',
    },
    rejectionReason: { type: String, default: '' },
    lastSyncedAt: { type: Date, default: null },

    sends: { type: [SendStatSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', CampaignSchema);
