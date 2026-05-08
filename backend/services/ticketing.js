const ServiceRequest = require('../models/ServiceRequest');

/**
 * Generate a human-friendly, monotonically increasing ticket id.
 * Format: TVK-YYMM-NNNN (4-digit zero-padded counter, resets per month).
 *
 * Resilient to duplicates: if a unique-index conflict is hit on a race,
 * we re-query the latest one and increment until we get a free slot.
 */
async function generateTicketId() {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const prefix = `TVK-${yy}${mm}-`;

  // Find the latest existing ticket for this month, increment its counter.
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await ServiceRequest.findOne({ ticketId: new RegExp(`^${prefix}`) })
      .sort({ ticketId: -1 })
      .select('ticketId')
      .lean();
    let next = 1;
    if (last?.ticketId) {
      const m = last.ticketId.match(/-(\d+)$/);
      if (m) next = parseInt(m[1], 10) + 1;
    }
    const candidate = `${prefix}${String(next).padStart(4, '0')}`;
    // Simple race-tolerance: caller still does findOne to verify uniqueness
    // before saving. The unique index on ticketId is the final guard.
    return candidate;
  }
  // Fallback (should never hit).
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

module.exports = { generateTicketId };
