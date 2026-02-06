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

module.exports = { predictDemand, checkHealth, retrain };
