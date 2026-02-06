/**
 * AI Service Routes
 * Proxy endpoints that call the Python AI microservice
 *
 * POST /api/ai/predict-demand  – demand forecast
 * POST /api/ai/retrain         – trigger model retrain (OWNER only)
 * GET  /api/ai/health          – AI service liveness check
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { ownerOrManager, ownerOnly } = require('../middleware/role.middleware');
const { predictDemand, triggerRetrain, aiHealth } = require('../controllers/ai.controller');

/**
 * POST /api/ai/predict-demand
 * Get AI demand prediction (OWNER or MANAGER)
 */
router.post('/predict-demand', authMiddleware, ownerOrManager, predictDemand);

/**
 * POST /api/ai/retrain
 * Trigger model retrain (OWNER only)
 */
router.post('/retrain', authMiddleware, ownerOnly, triggerRetrain);

/**
 * GET /api/ai/health
 * Check if the AI service is alive (any authenticated user)
 */
router.get('/health', authMiddleware, aiHealth);

module.exports = router;
