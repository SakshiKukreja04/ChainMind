/**
 * Health Check Route
 * Basic endpoint to verify backend is running
 */

const express = require('express');
const router = express.Router();

/**
 * GET /health
 * Returns service health status
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ChainMind Backend',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
