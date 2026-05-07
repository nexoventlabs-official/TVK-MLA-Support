/**
 * Refresh local Campaign records with the latest template status from Meta.
 * Useful as a cron job. Usage: npm run templates:sync
 */
require('dotenv').config();
const mongoose = require('mongoose');
const meta = require('../services/metaCloud');
const Campaign = require('../models/Campaign');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const list = await meta.listTemplates();
  const items = list.data || [];
  const byName = new Map(items.map((t) => [t.name, t]));
  const docs = await Campaign.find();
  let updated = 0;
  for (const c of docs) {
    const t = byName.get(c.name);
    if (!t) continue;
    const newStatus = String(t.status || 'PENDING').toUpperCase();
    if (c.status !== newStatus || !c.metaTemplateId) {
      c.metaTemplateId = t.id;
      c.status = newStatus;
      c.rejectionReason = t.rejected_reason || '';
      c.lastSyncedAt = new Date();
      await c.save();
      updated++;
    }
  }
  console.log(`✅ Synced ${updated}/${docs.length} templates`);
  await mongoose.disconnect();
})();
