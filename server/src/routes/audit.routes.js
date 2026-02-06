/**
 * Audit Routes (mounted at /api/audit)
 *
 * GET  /api/audit/logs                 – List audit logs for business
 * GET  /api/audit/logs/:orderId        – Get audit chain for an order
 * GET  /api/audit/verify/:orderId      – Verify full chain for an order
 * GET  /api/audit/verify/entry/:entryId – Verify single entry
 *
 * All routes require authentication (any role can read audit data).
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { authenticated } = require('../middleware/role.middleware');
const {
  listAuditLogs,
  getOrderAuditChain,
  verifyOrder,
  verifyEntry,
} = require('../controllers/audit.controller');

router.get('/logs', authMiddleware, authenticated, listAuditLogs);
router.get('/logs/:orderId', authMiddleware, authenticated, getOrderAuditChain);
router.get('/verify/entry/:entryId', authMiddleware, authenticated, verifyEntry);
router.get('/verify/:orderId', authMiddleware, authenticated, verifyOrder);

module.exports = router;
