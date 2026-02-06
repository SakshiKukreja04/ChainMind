/**
 * Vendor Routes
 * Onboarding, approval workflow, listing
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { ownerOnly, managerOnly, ownerOrManager } = require('../middleware/role.middleware');
const {
  submitVendor,
  getPendingVendors,
  getVendors,
  getVendor,
  approveVendor,
  rejectVendor,
} = require('../controllers/vendor.controller');

// ── Specific routes first (before /:id) ────────────────────────

/**
 * GET /api/vendors/pending
 * List vendors awaiting approval
 * Access: OWNER only
 */
router.get('/pending', authMiddleware, ownerOnly, getPendingVendors);

/**
 * GET /api/vendors
 * List all vendors for the business
 * Access: OWNER or MANAGER
 */
router.get('/', authMiddleware, ownerOrManager, getVendors);

/**
 * POST /api/vendors
 * Submit a new vendor request
 * Access: MANAGER only
 */
router.post('/', authMiddleware, managerOnly, submitVendor);

/**
 * GET /api/vendors/:id
 * Get single vendor details
 * Access: OWNER or MANAGER
 */
router.get('/:id', authMiddleware, ownerOrManager, getVendor);

/**
 * PUT /api/vendors/:id/approve
 * Approve a vendor
 * Access: OWNER only
 */
router.put('/:id/approve', authMiddleware, ownerOnly, approveVendor);

/**
 * PUT /api/vendors/:id/reject
 * Reject a vendor
 * Access: OWNER only
 */
router.put('/:id/reject', authMiddleware, ownerOnly, rejectVendor);

module.exports = router;
