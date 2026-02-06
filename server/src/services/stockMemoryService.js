/**
 * Stock Memory Service
 * Tracks manual stock-update patterns to generate AI_NUDGE notifications.
 *
 * Logic:
 *   - Each time stock is updated manually, record the timestamp.
 *   - If a product hasn't been updated in > N days, and its stock is
 *     approaching the threshold, fire an AI_NUDGE notification.
 *   - Runs as a periodic check (called from a setInterval in server.js
 *     or invoked on each stock read).
 */

const { Product, User } = require('../models');
const { notifyAllBusinessUsers } = require('./notificationService');

// How many days of silence triggers a nudge
const NUDGE_AFTER_DAYS = 7;

// Don't re-nudge within this window (hours)
const NUDGE_COOLDOWN_HOURS = 48;

// In-memory cache: productId → { lastManualUpdate, lastNudgeSent }
const stockMemory = new Map();

/**
 * Record a manual stock update (called from product controller).
 * @param {string} productId
 */
function recordManualStockUpdate(productId) {
  const key = productId.toString();
  const entry = stockMemory.get(key) || {};
  entry.lastManualUpdate = new Date();
  stockMemory.set(key, entry);
}

/**
 * Scan all active products for nudge-worthy conditions.
 * Should be called periodically (e.g., every 6 hours).
 */
async function scanForNudges() {
  try {
    // Find products with stock approaching threshold
    const products = await Product.find({
      isActive: true,
      $expr: {
        $lte: ['$currentStock', { $multiply: ['$minThreshold', 1.5] }],
      },
    })
      .select('_id name sku currentStock minThreshold businessId')
      .lean();

    const now = new Date();

    for (const product of products) {
      const key = product._id.toString();
      const entry = stockMemory.get(key) || {};

      // Check cooldown
      if (entry.lastNudgeSent) {
        const hoursSinceNudge = (now - entry.lastNudgeSent) / (1000 * 60 * 60);
        if (hoursSinceNudge < NUDGE_COOLDOWN_HOURS) continue;
      }

      // Check if no manual update in NUDGE_AFTER_DAYS
      const lastUpdate = entry.lastManualUpdate || product.updatedAt || product.createdAt;
      const daysSinceUpdate = (now - new Date(lastUpdate)) / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate >= NUDGE_AFTER_DAYS) {
        const stockRatio = product.currentStock / product.minThreshold;
        const urgency = stockRatio <= 0.5 ? 'critical' : stockRatio <= 1 ? 'warning' : 'info';

        await notifyAllBusinessUsers({
          businessId: product.businessId,
          type: 'AI_NUDGE',
          title: `Stock check needed: ${product.name}`,
          message:
            `${product.name} (${product.sku}) has not been updated in ${Math.floor(daysSinceUpdate)} days. ` +
            `Current stock: ${product.currentStock}, threshold: ${product.minThreshold}. ` +
            `Consider verifying physical stock or running AI demand forecast.`,
          referenceId: product._id,
          referenceType: 'Product',
          metadata: {
            urgency,
            daysSinceUpdate: Math.floor(daysSinceUpdate),
            currentStock: product.currentStock,
            minThreshold: product.minThreshold,
            stockRatio: Math.round(stockRatio * 100) / 100,
          },
        });

        // Update cooldown
        entry.lastNudgeSent = now;
        stockMemory.set(key, entry);

        console.log(
          `[StockMemory] AI_NUDGE sent for ${product.name} (${Math.floor(daysSinceUpdate)}d since update)`,
        );
      }
    }
  } catch (err) {
    console.error('[StockMemory] scanForNudges failed:', err.message);
  }
}

/**
 * Start the periodic nudge scanner.
 * @param {number} intervalMs – scan interval in ms (default 6 hours)
 * @returns {NodeJS.Timer} interval handle
 */
function startNudgeScanner(intervalMs = 6 * 60 * 60 * 1000) {
  console.log(`✓ Stock memory nudge scanner started (every ${intervalMs / 3600000}h)`);
  // Run once immediately, then on interval
  scanForNudges();
  return setInterval(scanForNudges, intervalMs);
}

module.exports = {
  recordManualStockUpdate,
  scanForNudges,
  startNudgeScanner,
};
