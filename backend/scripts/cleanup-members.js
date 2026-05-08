/**
 * Delete TVK members and their service requests.
 *
 * Usage
 *   node scripts/cleanup-members.js                    # delete every Member + every ServiceRequest
 *   node scripts/cleanup-members.js 91xxxxxxxxxx ...   # delete only the listed phone numbers
 *
 * Caution: this is irreversible. The script PRINTS what it will delete first
 * and asks for explicit confirmation via the CLEANUP_CONFIRM=yes env var.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');

async function main() {
  const phones = process.argv.slice(2).map((p) => String(p).replace(/\D/g, '')).filter(Boolean);
  const confirmed = String(process.env.CLEANUP_CONFIRM || '').toLowerCase() === 'yes';

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });

  const memberFilter = phones.length ? { phone: { $in: phones } } : {};
  const requestFilter = phones.length ? { phone: { $in: phones } } : {};

  const [members, requests] = await Promise.all([
    Member.find(memberFilter).select('phone name profileName isRegistered requestCount').lean(),
    ServiceRequest.countDocuments(requestFilter),
  ]);

  console.log(`Will delete ${members.length} member(s) and ${requests} service request(s).`);
  if (members.length === 0 && requests === 0) {
    console.log('Nothing to delete.');
    process.exit(0);
  }

  if (members.length) {
    console.log('Members targeted:');
    members.forEach((m) => {
      const tag = m.isRegistered ? 'REGISTERED' : 'guest';
      console.log(`  - ${m.phone}  ${m.name || m.profileName || '(no name)'}  [${tag}]  reqs=${m.requestCount || 0}`);
    });
  }

  if (!confirmed) {
    console.log('\n→ Re-run with CLEANUP_CONFIRM=yes to actually delete these records.');
    process.exit(0);
  }

  const reqRes = await ServiceRequest.deleteMany(requestFilter);
  const memRes = await Member.deleteMany(memberFilter);
  console.log(`Deleted ${memRes.deletedCount} member(s) and ${reqRes.deletedCount} service request(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
