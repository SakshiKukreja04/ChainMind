/**
 * Vendor Routes
 * Onboarding, approval workflow, listing
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { ownerOnly, managerOnly, ownerOrManager, vendorOnly } = require('../middleware/role.middleware');
const {
  submitVendor,
  getPendingVendors,
  getVendors,
  getVendor,
  approveVendor,
  rejectVendor,
  resendVendorCredentials,
  getMyProfile,
  updateMyProfile,
} = require('../controllers/vendor.controller');

// ── Vendor self-service routes ──────────────────────────────────

/**
 * GET /api/vendors/my-profile
 * Vendor sees their own profile
 * Access: VENDOR only
 */
router.get('/my-profile', authMiddleware, vendorOnly, getMyProfile);

/**
 * PUT /api/vendors/my-profile
 * Vendor updates their own profile
 * Access: VENDOR only
 */
router.put('/my-profile', authMiddleware, vendorOnly, updateMyProfile);

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

/**
 * POST /api/vendors/:id/resend-credentials
 * Resend/reset vendor login credentials
 * Access: OWNER only
 */
router.post('/:id/resend-credentials', authMiddleware, ownerOnly, resendVendorCredentials);

module.exports = router;
