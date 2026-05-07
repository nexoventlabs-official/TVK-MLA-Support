require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin@123';
  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.findOneAndUpdate(
    { username },
    { $set: { passwordHash } },
    { upsert: true }
  );
  console.log(`✅ Admin upserted: ${username}`);
  await mongoose.disconnect();
})();
