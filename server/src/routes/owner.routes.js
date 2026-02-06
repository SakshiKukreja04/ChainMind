/**
 * Owner Routes (mounted at /api/owner)
 *
 * GET  /api/owner/summary           – Dashboard summary stats (OWNER)
 * GET  /api/owner/analytics          – Analytics pipelines (OWNER)
 * PUT  /api/owner/settings           – Update User + Business (OWNER)
 * GET  /api/owner/orders/tracking    – Track DISPATCHED & DELIVERED orders (OWNER)
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { ownerOnly } = require('../middleware/role.middleware');
const { getOwnerOrderTracking } = require('../controllers/order.controller');
const { getOwnerSummary, getOwnerAnalytics, updateOwnerSettings } = require('../controllers/owner.controller');

router.get('/summary', authMiddleware, ownerOnly, getOwnerSummary);
router.get('/analytics', authMiddleware, ownerOnly, getOwnerAnalytics);
router.put('/settings', authMiddleware, ownerOnly, updateOwnerSettings);
router.get('/orders/tracking', authMiddleware, ownerOnly, getOwnerOrderTracking);

module.exports = router;
