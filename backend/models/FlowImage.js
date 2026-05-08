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
    /**
     * Cloudinary resource_type needed to correctly DELETE the asset later.
     *   - 'image' (default) for PNG/JPG banners & icons
     *   - 'raw'   for PDF documents uploaded against pdf_documents keys
     */
    resourceType: { type: String, enum: ['image', 'raw'], default: 'image' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlowImage', FlowImageSchema);
