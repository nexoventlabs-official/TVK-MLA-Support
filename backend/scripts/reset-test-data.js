/**
 * Wipe all test grievance / contact data from MongoDB and Cloudinary.
 *
 * What this DELETES (test data — irreversible):
 *   ✗ Every document in `Member`         (registered users + all WhatsApp contacts)
 *   ✗ Every document in `ServiceRequest` (every ticket, descriptions, geo, mediaUrls)
 *   ✗ Cloudinary folder `tvk/tickets/*`  (WhatsApp bot ticket photos)
 *   ✗ Cloudinary folder `tvk/grievances/*` (citizen-portal grievance photos)
 *
 * What this NEVER touches (preserved):
 *   ✓ Events            (Event collection + tvk/events/* on Cloudinary)
 *   ✓ Campaigns         (Campaign collection + tvk/templates/* on Cloudinary)
 *   ✓ Flow images       (FlowImage collection + tvk/flow/* on Cloudinary)
 *   ✓ Voter database    (separate connection, read-only roll)
 *   ✓ Admin accounts    (Admin collection)
 *   ✓ OTP codes         (OtpCode — TTL-purged anyway)
 *
 * Safety rails
 *   1. Dry-run by default — prints counts only.
 *   2. Set RESET_CONFIRM=yes to actually delete.
 *   3. Reports per-collection / per-folder counts after.
 *
 * Usage
 *   node scripts/reset-test-data.js                  # dry-run preview
 *   RESET_CONFIRM=yes node scripts/reset-test-data.js   # actually wipe
 */
require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const TICKET_PHOTO_PREFIXES = ['tvk/tickets/', 'tvk/grievances/'];

async function purgeCloudinaryPrefix(prefix) {
  // delete_resources_by_prefix removes up to 1000 resources per call; loop
  // while the response is `partial: true` so very large test datasets are
  // fully cleaned out without operator follow-up.
  let totalDeleted = 0;
  let pass = 0;
  // Hard cap loop iterations to avoid an infinite spin if Cloudinary
  // returns partial=true forever for some reason.
  while (pass < 50) {
    pass += 1;
    let res;
    try {
      res = await cloudinary.api.delete_resources_by_prefix(prefix, {
        invalidate: true,
        resource_type: 'image',
      });
    } catch (err) {
      console.warn(`  ⚠️  Cloudinary delete failed for prefix "${prefix}":`, err.message);
      break;
    }
    const deletedCount = Object.keys(res.deleted || {}).length;
    totalDeleted += deletedCount;
    if (!res.partial || deletedCount === 0) break;
  }
  return totalDeleted;
}

async function main() {
  const confirmed = String(process.env.RESET_CONFIRM || '').toLowerCase() === 'yes';

  console.log('• Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB,
  });
  console.log('  Connected.');

  const [memberCount, requestCount, registeredCount] = await Promise.all([
    Member.countDocuments(),
    ServiceRequest.countDocuments(),
    Member.countDocuments({ isRegistered: true }),
  ]);

  console.log('');
  console.log('Currently in MongoDB:');
  console.log(`  • Members (all contacts):        ${memberCount}`);
  console.log(`    └─ of which registered:        ${registeredCount}`);
  console.log(`  • Service requests:              ${requestCount}`);

  if (!confirmed) {
    console.log('');
    console.log('Cloudinary folders that will be wiped:');
    TICKET_PHOTO_PREFIXES.forEach((p) => console.log(`  • ${p}*`));
    console.log('');
    console.log('Folders that will NOT be touched:');
    console.log('  ✓ tvk/events/*     (event images)');
    console.log('  ✓ tvk/flow/*       (admin-managed flow images)');
    console.log('  ✓ tvk/templates/*  (campaign template assets)');
    console.log('');
    console.log('→ Re-run with  RESET_CONFIRM=yes  to actually delete this data.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ─── Destructive section ──────────────────────────────────────────
  console.log('');
  console.log('⚠️  RESET_CONFIRM=yes — proceeding with delete.');

  console.log('');
  console.log('• Deleting MongoDB documents…');
  const reqRes = await ServiceRequest.deleteMany({});
  console.log(`  ServiceRequest:  ${reqRes.deletedCount} deleted`);
  const memRes = await Member.deleteMany({});
  console.log(`  Member:          ${memRes.deletedCount} deleted`);

  console.log('');
  console.log('• Purging Cloudinary ticket/grievance photos…');
  for (const prefix of TICKET_PHOTO_PREFIXES) {
    const n = await purgeCloudinaryPrefix(prefix);
    console.log(`  ${prefix}*  →  ${n} resource(s) deleted`);
  }

  console.log('');
  console.log('✅ Test data reset complete.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ reset failed:', err);
  process.exit(1);
});
