const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');
const Member = require('../models/Member');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username & password required' });

    const admin = await Admin.findOne({ username: username.trim() });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id.toString(), username: admin.username, role: admin.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: admin._id, username: admin.username, role: admin.role },
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/verify', authMiddleware, async (req, res) => {
  const admin = await Admin.findById(req.user.id).lean();
  if (!admin) return res.status(401).json({ error: 'Invalid' });
  res.json({ user: { id: admin._id, username: admin.username, role: admin.role } });
});

/**
 * POST /push-token
 *
 * Accepts either an admin JWT (signed with JWT_SECRET) or a portal/citizen
 * JWT (signed with PORTAL_JWT_SECRET) so the mobile app can call one
 * endpoint regardless of who is logged in. The bearer payload tells us
 * which collection to update; we de-dup by token string so a reinstalled
 * app never piles up dead tokens.
 *
 * Body: { token: string, platform?: 'ios' | 'android' | 'web', role?: 'admin' | 'user' }
 */
router.post('/push-token', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!bearer) return res.status(401).json({ error: 'Unauthorized' });

    const { token, platform = '' } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token required' });
    }

    // Try admin first.
    let payload = null;
    let kind = null;
    try {
      payload = jwt.verify(bearer, process.env.JWT_SECRET || 'dev-secret');
      kind = 'admin';
    } catch {
      try {
        payload = jwt.verify(bearer, process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || 'dev-portal-secret');
        kind = 'user';
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const Model = kind === 'admin' ? Admin : Member;
    const id = kind === 'admin' ? payload.id : payload.memberId;
    if (!id) return res.status(400).json({ error: 'bad payload' });

    // Atomic: pull any existing copy of this token first (in case it was
    // registered to a different account), then push the fresh entry.
    await Model.updateMany({ 'pushTokens.token': token }, { $pull: { pushTokens: { token } } });
    await Model.updateOne(
      { _id: id },
      { $push: { pushTokens: { token, platform, addedAt: new Date() } } }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] push-token error:', err);
    res.status(500).json({ error: 'Failed to register token' });
  }
});

module.exports = router;
