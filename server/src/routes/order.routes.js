/**
 * Order Routes
 * Full order lifecycle: creation → approval → vendor confirm → dispatch → received
 *
 * POST /api/orders/ai-reorder       – Submit AI-based reorder (MANAGER)
 * GET  /api/orders/pending           – List pending orders (OWNER)
 * GET  /api/orders/vendor            – List orders for vendor (VENDOR)
 * GET  /api/orders                   – List all orders (OWNER|MANAGER)
 * POST /api/orders/:id/approve       – Approve order (OWNER)
 * POST /api/orders/:id/reject        – Reject order (OWNER)
 * POST /api/orders/:id/confirm       – Vendor confirms order (VENDOR)
 * POST /api/orders/:id/dispatch      – Vendor dispatches order (VENDOR)
 * POST /api/orders/:id/received      – Owner marks received (OWNER)
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { ownerOnly, managerOnly, ownerOrManager, vendorOnly } = require('../middleware/role.middleware');
const {
  submitAiReorder,
  listOrders,
  getPendingOrders,
  approveOrder,
  rejectOrder,
  getVendorOrders,
  confirmOrder,
  dispatchOrder,
  markOrderReceived,
  vendorOrderAction,
  updateDeliveryStatus,
  getVendorPerformance,
} = require('../controllers/order.controller');

/** Submit AI-based reorder request (MANAGER) */
router.post('/ai-reorder', authMiddleware, managerOnly, submitAiReorder);

/** Get pending orders (OWNER) — must come before /:id */
router.get('/pending', authMiddleware, ownerOnly, getPendingOrders);

/** Get vendor orders (VENDOR) — must come before /:id */
router.get('/vendor', authMiddleware, vendorOnly, getVendorOrders);

/** Get vendor performance metrics (VENDOR) */
router.get('/vendor/performance', authMiddleware, vendorOnly, getVendorPerformance);

/** List all orders (OWNER or MANAGER) */
router.get('/', authMiddleware, ownerOrManager, listOrders);

/** Approve a pending order (OWNER) */
router.post('/:id/approve', authMiddleware, ownerOnly, approveOrder);

/** Reject a pending order (OWNER) */
router.post('/:id/reject', authMiddleware, ownerOnly, rejectOrder);

/** Vendor confirms an approved order (VENDOR) */
router.post('/:id/confirm', authMiddleware, vendorOnly, confirmOrder);

/** Vendor dispatches a confirmed order (VENDOR) */
router.post('/:id/dispatch', authMiddleware, vendorOnly, dispatchOrder);

/** Owner marks dispatched order as received (OWNER) */
router.post('/:id/received', authMiddleware, ownerOnly, markOrderReceived);

/** Vendor action on approved order: ACCEPT / REJECT / REQUEST_DELAY */
router.post('/:id/vendor-action', authMiddleware, vendorOnly, vendorOrderAction);

/** Vendor updates delivery status: DISPATCHED → IN_TRANSIT → DELIVERED */
router.patch('/:id/delivery-status', authMiddleware, vendorOnly, updateDeliveryStatus);

module.exports = router;
