/**
 * Owner Routes (mounted at /api/owner)
 *
 * GET /api/owner/orders/tracking  – Track DISPATCHED & DELIVERED orders (OWNER)
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { ownerOnly } = require('../middleware/role.middleware');
const { getOwnerOrderTracking } = require('../controllers/order.controller');

/** SME Owner order tracking — DISPATCHED + DELIVERED */
router.get('/orders/tracking', authMiddleware, ownerOnly, getOwnerOrderTracking);

module.exports = router;
