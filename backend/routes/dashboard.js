const express = require('express');
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const ServiceRequest = require('../models/ServiceRequest');
const Campaign = require('../models/Campaign');
const { SERVICES } = require('../services/serviceCatalog');

const router = express.Router();

router.get('/stats', auth, async (_req, res) => {
  try {
    const [members, totalRequests, newRequests, inProgress, resolved, campaigns, approved, pending] =
      await Promise.all([
        Member.countDocuments(),
        ServiceRequest.countDocuments(),
        ServiceRequest.countDocuments({ status: 'new' }),
        ServiceRequest.countDocuments({ status: 'in_progress' }),
        ServiceRequest.countDocuments({ status: 'resolved' }),
        Campaign.countDocuments(),
        Campaign.countDocuments({ status: 'APPROVED' }),
        Campaign.countDocuments({ status: 'PENDING' }),
      ]);

    // Aggregate by service
    const byServiceRaw = await ServiceRequest.aggregate([
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
    ]);
    const bySrv = Object.fromEntries(byServiceRaw.map((x) => [x._id, x.count]));
    const byService = SERVICES.map((s) => ({ id: s.id, title: s.title, count: bySrv[s.id] || 0 }));

    const recentRequests = await ServiceRequest.find().sort({ createdAt: -1 }).limit(8).lean();
    const recentMembers = await Member.find().sort({ createdAt: -1 }).limit(5).lean();
    const recentCampaigns = await Campaign.find().sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      stats: {
        members,
        totalRequests,
        newRequests,
        inProgress,
        resolved,
        campaigns,
        approvedCampaigns: approved,
        pendingCampaigns: pending,
      },
      byService,
      recentRequests,
      recentMembers,
      recentCampaigns,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
