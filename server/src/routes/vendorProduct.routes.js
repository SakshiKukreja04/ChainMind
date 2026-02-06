/**
 * Vendor Routes (mounted at /api/vendor)
 *
 * Catalog:
 *   POST   /api/vendor/products              – Add catalog item      (VENDOR)
 *   GET    /api/vendor/products              – List catalog           (VENDOR | OWNER | MANAGER)
 *   PUT    /api/vendor/products/:id          – Update item            (VENDOR)
 *   PATCH  /api/vendor/products/:id/status   – Toggle active/inactive (VENDOR)
 *
 * Order lifecycle:
 *   PUT    /api/vendor/orders/:orderId/status – Update order status   (VENDOR)
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { vendorOnly, authenticated } = require('../middleware/role.middleware');
const {
  createVendorProduct,
  listVendorProducts,
  updateVendorProduct,
  toggleVendorProductStatus,
} = require('../controllers/vendorProduct.controller');
const {
  vendorUpdateOrderStatus,
} = require('../controllers/order.controller');

/** ── Catalog ──────────────────────────────────────────────── */

/** List catalog — any authenticated user (controller enforces ownership) */
router.get('/products', authMiddleware, authenticated, listVendorProducts);

/** Create catalog item — VENDOR only */
router.post('/products', authMiddleware, vendorOnly, createVendorProduct);

/** Update catalog item — VENDOR only */
router.put('/products/:id', authMiddleware, vendorOnly, updateVendorProduct);

/** Toggle active/inactive — VENDOR only */
router.patch('/products/:id/status', authMiddleware, vendorOnly, toggleVendorProductStatus);

/** ── Order lifecycle ──────────────────────────────────────── */

/** Vendor updates order status: APPROVED→ACCEPTED→DISPATCHED→DELIVERED */
router.put('/orders/:orderId/status', authMiddleware, vendorOnly, vendorUpdateOrderStatus);

module.exports = router;
