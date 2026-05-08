const mongoose = require('mongoose');

/**
 * An upcoming event (yatra, public meeting, camp, etc.) shown to users in the
 * "Upcoming Events" branch of the WhatsApp flow. Admin creates / edits / deletes
 * via the Events admin page.
 *
 * Pattern adapted from the Himalayan-Yoga project: title/description/image
 * (Cloudinary URL), start + end date window, active toggle.
 */
const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    image: { type: String, default: '' },
    publicId: { type: String, default: '' },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

EventSchema.index({ active: 1, fromDate: 1 });

module.exports = mongoose.model('Event', EventSchema);
