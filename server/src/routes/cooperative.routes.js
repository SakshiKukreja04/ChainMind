/**
 * Cooperative Buying Routes
 * All endpoints require authentication + OWNER role.
 *
 * GET    /api/cooperative/discover/:productId  – Discover co-buy opportunities
 * GET    /api/cooperative/open                 – Browse joinable groups
 * GET    /api/cooperative                      – List my cooperatives
 * GET    /api/cooperative/:id                  – Detail view
 * POST   /api/cooperative/create               – Create a new group
 * POST   /api/cooperative/:id/join             – Join an existing group
 * POST   /api/cooperative/:id/approve          – Approve participation
 * POST   /api/cooperative/:id/select-vendor    – Select vendor for bulk order
 * POST   /api/cooperative/:id/cancel           – Cancel the cooperative
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { ownerOnly } = require('../middleware/role.middleware');
const {
  discoverOpportunities,
  getOpenGroups,
  listCooperatives,
  getCooperative,
  createCooperative,
  joinCooperative,
  approveParticipation,
  selectVendor,
  cancelCooperative,
} = require('../controllers/cooperative.controller');

/** Discover cooperative opportunities for a product */
router.get('/discover/:productId', authMiddleware, ownerOnly, discoverOpportunities);

/** Browse open cooperative groups available to join */
router.get('/open', authMiddleware, ownerOnly, getOpenGroups);

/** List cooperatives the caller's business participates in */
router.get('/', authMiddleware, ownerOnly, listCooperatives);

/** Get a single cooperative group detail */
router.get('/:id', authMiddleware, ownerOnly, getCooperative);

/** Create a new cooperative buying group */
router.post('/create', authMiddleware, ownerOnly, createCooperative);

/** Join an existing cooperative group */
router.post('/:id/join', authMiddleware, ownerOnly, joinCooperative);

/** Approve participation in a cooperative */
router.post('/:id/approve', authMiddleware, ownerOnly, approveParticipation);

/** Select vendor for the bulk order (initiator only) */
router.post('/:id/select-vendor', authMiddleware, ownerOnly, selectVendor);

/** Cancel the cooperative group (initiator only) */
router.post('/:id/cancel', authMiddleware, ownerOnly, cancelCooperative);

module.exports = router;
