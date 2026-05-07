const mongoose = require('mongoose');

/**
 * A grievance / service request submitted by a citizen via the WhatsApp flow.
 * Stores the chosen Service (e.g. civic_works) and Option (e.g. road_repair),
 * plus optional free-text description provided by the user.
 */
const ServiceRequestSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    serviceId: { type: String, required: true, index: true },     // e.g. 'civic_works'
    serviceTitle: { type: String, default: '' },                  // e.g. 'Civic Works'
    optionId: { type: String, required: true, index: true },      // e.g. 'road_repair'
    optionTitle: { type: String, default: '' },                   // e.g. 'Road Repair'
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    status: { type: String, enum: ['new', 'in_progress', 'resolved', 'rejected'], default: 'new', index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

ServiceRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
