/**
 * Inventory AI Suggestion Routes
 * Endpoints for AI demand predictions and suggestion management
 *
 * POST /api/inventory/:productId/ai-suggestion  – Generate AI suggestion (MANAGER)
 * GET  /api/inventory/ai-suggestions             – List all suggestions (OWNER|MANAGER)
 * GET  /api/inventory/ai-suggestions/:id         – Get single suggestion (OWNER|MANAGER)
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { managerOnly, ownerOrManager } = require('../middleware/role.middleware');
const {
  generateSuggestion,
  listSuggestions,
  getSuggestion,
} = require('../controllers/aiSuggestion.controller');

/** List suggestions (must come before /:productId to avoid route conflict) */
router.get('/ai-suggestions', authMiddleware, ownerOrManager, listSuggestions);

/** Get single suggestion */
router.get('/ai-suggestions/:id', authMiddleware, ownerOrManager, getSuggestion);

/** Generate AI suggestion for a product (MANAGER triggers) */
router.post('/:productId/ai-suggestion', authMiddleware, managerOnly, generateSuggestion);

module.exports = router;
