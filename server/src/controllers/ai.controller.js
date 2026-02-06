/**
 * AI Demand Forecasting Controller
 * Bridges the Node.js backend and the Python AI microservice.
 *
 * Endpoints:
 *   POST /api/ai/predict-demand   – get forecast for a single product
 *   POST /api/ai/retrain          – trigger model retrain
 *   GET  /api/ai/health           – check AI service health
 */

const { Product, Vendor } = require('../models');
const env = require('../config/env');
const axios = require('axios');

const AI_BASE = env.ML_SERVICE_URL || 'http://localhost:5001';

// ── Helper: call the Python AI service ──────────────────────────
async function callAI(path, method = 'POST', body = null) {
  const config = {
    method,
    url: `${AI_BASE}${path}`,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) config.data = body;

  const response = await axios(config);
  return response.data;
}

// ── POST /api/ai/predict-demand ─────────────────────────────────
const predictDemand = async (req, res) => {
  try {
    const { productId, salesHistory, currentStock, leadTimeDays } = req.body;

    // --- Option A: caller supplies all data directly ---------------
    if (salesHistory && currentStock !== undefined && leadTimeDays !== undefined) {
      const prediction = await callAI('/predict-demand', 'POST', {
        productId: productId || null,
        salesHistory,
        currentStock,
        leadTimeDays,
      });
      return res.json({ success: true, prediction });
    }

    // --- Option B: look up product in DB and build payload ---------
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Either provide { salesHistory, currentStock, leadTimeDays } '
               + 'or a valid { productId }',
      });
    }

    const product = await Product.findOne({
      _id: productId,
      businessId: req.user.businessId,
    }).populate('vendorId');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Build sales history from stockHistory (if available)
    let history = [];
    if (product.stockHistory && product.stockHistory.length > 0) {
      // Each entry has { month, quantitySold, revenue }
      // Spread monthly totals into approximate daily values
      for (const entry of product.stockHistory) {
        const dailyAvg = Math.round((entry.quantitySold || 0) / 30);
        for (let d = 0; d < 30; d++) {
          history.push(dailyAvg);
        }
      }
    }

    // Fallback: generate a synthetic-ish history from currentStock
    if (history.length < 14) {
      const avg = Math.max(1, Math.round(product.currentStock / 30));
      history = Array.from({ length: 30 }, () =>
        Math.max(0, avg + Math.round((Math.random() - 0.5) * avg * 0.4))
      );
    }

    const leadTime = product.vendorId?.leadTimeDays || 7;

    const prediction = await callAI('/predict-demand', 'POST', {
      productId: product._id.toString(),
      salesHistory: history,
      currentStock: product.currentStock,
      leadTimeDays: leadTime,
    });

    // Optionally persist the AI recommendation on the order model later
    return res.json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        currentStock: product.currentStock,
      },
      prediction,
    });
  } catch (err) {
    console.error('AI predictDemand error:', err.response?.data || err.message || err);
    const status = err.response?.status || err.status || 500;
    const message = err.response?.data?.error || err.message || 'Failed to get demand prediction';
    return res.status(status).json({
      success: false,
      message,
    });
  }
};

// ── POST /api/ai/retrain ────────────────────────────────────────
const triggerRetrain = async (req, res) => {
  try {
    const result = await callAI('/retrain', 'POST');
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('AI retrain error:', err.message);
    const status = err.response?.status || err.status || 500;
    const message = err.response?.data?.error || err.message || 'Failed to trigger retrain';
    return res.status(status).json({
      success: false,
      message,
    });
  }
};

// ── GET /api/ai/health ──────────────────────────────────────────
const aiHealth = async (req, res) => {
  try {
    const result = await callAI('/health', 'GET');
    return res.json({ success: true, ai: result });
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'AI service unreachable',
      error: err.message,
    });
  }
};

module.exports = { predictDemand, triggerRetrain, aiHealth };
