const mongoose = require('mongoose');

/**
 * Stores Cloudinary URLs for every image used by the WhatsApp flow + chatbot.
 * `key` is a stable identifier the backend looks up at runtime.
 * Catalog of keys: services/flowImages.js
 */
const FlowImageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: '' },
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlowImage', FlowImageSchema);
