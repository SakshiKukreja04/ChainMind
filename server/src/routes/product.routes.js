/**
 * Product & Alert Routes
 * All inventory management endpoints
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { managerOnly, ownerOrManager } = require('../middleware/role.middleware');
const {
  getProducts,
  getProduct,
  addProduct,
  updateProduct,
  updateStock,
  correctStock,
  assignVendor,
  deleteProduct,
} = require('../controllers/product.controller');
const {
  getAlerts,
  markAlertRead,
  markAllRead,
} = require('../controllers/alert.controller');

// ── Alert routes (must come BEFORE /:id to avoid route conflicts) ───

/**
 * GET /api/products/alerts/list
 * List all stock alerts (OWNER or MANAGER)
 */
router.get('/alerts/list', authMiddleware, ownerOrManager, getAlerts);

/**
 * PUT /api/products/alerts/read-all
 * Mark all alerts read (OWNER or MANAGER)
 */
router.put('/alerts/read-all', authMiddleware, ownerOrManager, markAllRead);

/**
 * PUT /api/products/alerts/:id/read
 * Mark alert as read (OWNER or MANAGER)
 */
router.put('/alerts/:id/read', authMiddleware, ownerOrManager, markAlertRead);

// ── Product routes ──────────────────────────────────────────────

/**
 * GET /api/products
 * List all products (OWNER or MANAGER)
 */
router.get('/', authMiddleware, ownerOrManager, getProducts);

/**
 * POST /api/products
 * Add new product (MANAGER only)
 */
router.post('/', authMiddleware, managerOnly, addProduct);

/**
 * GET /api/products/:id
 * Get single product (OWNER or MANAGER)
 */
router.get('/:id', authMiddleware, ownerOrManager, getProduct);

/**
 * PUT /api/products/:id
 * Update product details (MANAGER only)
 */
router.put('/:id', authMiddleware, managerOnly, updateProduct);

/**
 * PUT /api/products/:id/stock
 * Increment / decrement stock (MANAGER only)
 */
router.put('/:id/stock', authMiddleware, managerOnly, updateStock);

/**
 * PUT /api/products/:id/correct
 * Physical stock correction (MANAGER only)
 */
router.put('/:id/correct', authMiddleware, managerOnly, correctStock);

/**
 * PUT /api/products/:id/assign-vendor
 * Assign vendor to product (MANAGER only)
 */
router.put('/:id/assign-vendor', authMiddleware, managerOnly, assignVendor);

/**
 * DELETE /api/products/:id
 * Soft-delete product (MANAGER only)
 */
router.delete('/:id', authMiddleware, managerOnly, deleteProduct);

module.exports = router;
