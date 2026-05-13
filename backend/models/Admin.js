const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    // Expo push tokens registered by the mobile admin app.
    pushTokens: {
      type: [{
        token: { type: String, required: true },
        platform: { type: String, default: '' },
        addedAt: { type: Date, default: Date.now },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', AdminSchema);
