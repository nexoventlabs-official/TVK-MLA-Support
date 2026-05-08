const mongoose = require('mongoose');

/**
 * A grievance / service request submitted by a citizen via the WhatsApp flow.
 *
 * Carries a human-readable `ticketId` (TVK-YYMM-NNNN) — only requests with a
 * `ticketId` are surfaced to the user under "Your Requests" and to the admin
 * under "Service Requests". Pure-URL terminal actions (e.g. "Open TNPDS Portal")
 * do NOT create a ServiceRequest.
 */

const GeoSchema = new mongoose.Schema(
  {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    name: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  { _id: false }
);

const ServiceRequestSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true, sparse: true, index: true }, // e.g. TVK-2605-0007

    phone: { type: String, required: true, index: true },
    name: { type: String, default: '' },

    serviceId: { type: String, required: true, index: true },     // e.g. 'civic_works'
    serviceTitle: { type: String, default: '' },                  // e.g. 'Civic Works'
    optionId: { type: String, required: true, index: true },      // e.g. 'road_repair'
    optionTitle: { type: String, default: '' },                   // e.g. 'Road Repair'

    description: { type: String, default: '' },
    schoolName: { type: String, default: '' },                    // mid-day-meal-issue specific

    location: { type: String, default: '' },                      // free-text fallback
    geo: { type: GeoSchema, default: null },                      // shared-location data
    mediaUrls: { type: [String], default: [] },                   // Cloudinary photo URLs

    /**
     * Status lifecycle visible to the citizen:
     *   pending     → just created, awaiting admin triage
     *   accepted    → admin accepted, queued
     *   processing  → field work in progress
     *   completed   → resolved
     *   rejected    → can't be processed (with notes)
     */
    status: {
      type: String,
      enum: ['pending', 'accepted', 'processing', 'completed', 'rejected'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

ServiceRequestSchema.index({ createdAt: -1 });
ServiceRequestSchema.index({ phone: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
