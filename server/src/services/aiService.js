/**
 * AI Service Client
 * Centralised HTTP client for calling the Python Flask AI microservice.
 *
 * Features:
 *   - Configurable base URL via env
 *   - 3-second timeout
 *   - Structured error handling
 *   - Request / response logging
 */

const axios = require('axios');
const env = require('../config/env');

const AI_BASE = env.ML_SERVICE_URL || 'http://localhost:5001';
const TIMEOUT_MS = 3000; // 3 second timeout for AI calls

const client = axios.create({
  baseURL: AI_BASE,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Call the AI /predict-demand endpoint
 * @param {Object} payload - { productId, salesHistory, currentStock, leadTimeDays }
 * @returns {Object} prediction result
 */
async function predictDemand(payload) {
  console.log('[AI-Service] Request  → /predict-demand', {
    productId: payload.productId,
    historyLen: payload.salesHistory?.length,
    currentStock: payload.currentStock,
    leadTimeDays: payload.leadTimeDays,
  });

  try {
    const { data } = await client.post('/predict-demand', payload);

    console.log('[AI-Service] Response ← /predict-demand', {
      demand: data.predictedDailyDemand,
      stockout: data.daysToStockout,
      reorder: data.suggestedReorderQty,
      confidence: data.confidence,
      inferenceMs: data.inferenceTimeMs,
    });

    return data;
  } catch (err) {
    const message = err.response?.data?.error || err.message || 'AI service unreachable';
    console.error('[AI-Service] Error    ✗', message);

    // Return a graceful fallback error object
    throw Object.assign(new Error(message), {
      status: err.response?.status || 503,
      isAiError: true,
    });
  }
}

/**
 * Check AI service health
 */
async function checkHealth() {
  try {
    const { data } = await client.get('/health');
    return data;
  } catch {
    return { status: 'unreachable' };
  }
}

/**
 * Trigger model retrain
 */
async function retrain() {
  const { data } = await client.post('/retrain');
  return data;
}

// ── Seasonal / location-aware forecast ─────────────────────────
const SalesHistory = require('../models/SalesHistory.model');
const Product = require('../models/Product.model');
const Business = require('../models/Business.model');
const { detectHealthContext, applyContextBoost } = require('./llmContextService');

/**
 * Build a seasonal demand forecast for a product.
 *
 * Steps:
 *   1. Pull the last `historyDays` of SalesHistory from Mongo
 *   2. Look up product & vendor for currentStock / leadTime
 *   3. POST to Flask /predict-demand with recentSales + city
 *
 * @param {string}  productId    - Product ObjectId
 * @param {string}  businessId   - Business ObjectId
 * @param {string}  city         - optional, defaults to product's primary city
 * @param {number}  historyDays  - how many days of history to send (default 30)
 * @returns {Object}  prediction from AI service
 */
async function forecastDemand({ productId, businessId, city, historyDays = 30 }) {
  // 1. Load product for stock & vendor info
  const product = await Product.findOne({ _id: productId, businessId })
    .populate('vendorId', 'leadTimeDays')
    .lean();

  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });

  const currentStock = product.currentStock ?? 0;
  const leadTimeDays = product.vendorId?.leadTimeDays ?? 7;

  // 2. Query SalesHistory for this product×city
  const since = new Date();
  since.setDate(since.getDate() - historyDays);

  const filter = { productId, date: { $gte: since } };
  if (city) filter.city = city.toLowerCase();

  const salesDocs = await SalesHistory.find(filter)
    .sort({ date: 1 })
    .select('date quantitySold city')
    .lean();

  // Build flat daily sales array (fill missing days with 0)
  const salesMap = new Map();
  for (const doc of salesDocs) {
    const key = doc.date.toISOString().slice(0, 10);
    salesMap.set(key, (salesMap.get(key) || 0) + doc.quantitySold);
  }

  const recentSales = [];
  for (let d = historyDays; d > 0; d--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const key = dt.toISOString().slice(0, 10);
    recentSales.push(salesMap.get(key) || 0);
  }

  // 3. Call Flask ML service
  const payload = {
    productId,
    salesHistory: recentSales,
    currentStock,
    leadTimeDays,
    city: city || null,
  };

  console.log('[AI-Service] forecastDemand →', {
    productId,
    city,
    historyLen: recentSales.length,
    currentStock,
    leadTimeDays,
  });

  const { data } = await client.post('/predict-demand', payload);

  console.log('[AI-Service] forecastDemand ←', {
    demand: data.predictedDailyDemand,
    stockout: data.daysToStockout,
    reorder: data.suggestedReorderQty,
    confidence: data.confidence,
  });

  // ── LLM health-context awareness layer ───────────────────────
  // Fetch business for location & industry context
  const business = await Business.findById(businessId).select('location industry').lean();

  const llmContext = await detectHealthContext({
    productName: product.name || productId,
    city: city || business?.location || 'unknown',
    industry: business?.industry || 'general',
    category: product.category || '',
  });
  const enriched = applyContextBoost(data, llmContext);

  return enriched;
}

module.exports = { predictDemand, checkHealth, retrain, forecastDemand };
