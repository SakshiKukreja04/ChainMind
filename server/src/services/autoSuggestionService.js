/**
 * Auto-Suggestion Service
 * Automatically generates AI reorder suggestions when a product's stock
 * falls below its minimum threshold and no active suggestion / in-flight order exists.
 *
 * Called from:
 *   - product.controller.js → updateStock, correctStock
 *   - order.controller.js   → markOrderReceived, vendorUpdateOrderStatus (DELIVERED)
 */

const { Product, AiSuggestion, Business, Order } = require('../models');
const aiService = require('./aiService');
const { detectHealthContext, applyContextBoost } = require('./llmContextService');
const { notifyAllBusinessUsers } = require('./notificationService');
const { getSocket } = require('../sockets');

/**
 * Check if a product needs a new AI suggestion and create one automatically.
 * Conditions for auto-generation:
 *   1. Product current stock is below minThreshold
 *   2. No ACTIVE suggestion exists for this product (within 24h)
 *   3. No in-flight order (PENDING_APPROVAL / APPROVED / CONFIRMED / DISPATCHED) exists
 *
 * @param {string} productId - Product ObjectId
 * @param {string} businessId - Business ObjectId
 * @returns {Object|null} The created suggestion, or null if skipped
 */
async function autoGenerateSuggestionIfNeeded(productId, businessId) {
  try {
    // 1. Load product with vendor info
    const product = await Product.findById(productId).populate('vendorId');
    if (!product) return null;

    // Only trigger if stock is below threshold
    if (product.currentStock >= product.minThreshold) return null;

    // 2. Check for existing ACTIVE suggestion within last 2 hours (debounce)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const activeSuggestion = await AiSuggestion.findOne({
      productId,
      businessId,
      status: 'ACTIVE',
      createdAt: { $gte: twoHoursAgo },
    });
    if (activeSuggestion) {
      console.log(`[AutoSuggestion] Skipped ${product.name}: active suggestion exists (within 2h)`);
      return null;
    }

    // 3. Check if there's already a SUBMITTED suggestion with an in-flight order
    //    that was created within the last 2 hours — prevents rapid duplicate orders
    const recentSubmitted = await AiSuggestion.findOne({
      productId,
      businessId,
      status: 'SUBMITTED',
      createdAt: { $gte: twoHoursAgo },
    });
    if (recentSubmitted) {
      // Check if the linked order is still in-flight
      if (recentSubmitted.orderId) {
        const linkedOrder = await Order.findOne({
          _id: recentSubmitted.orderId,
          status: { $in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'DISPATCHED'] },
        });
        if (linkedOrder) {
          console.log(`[AutoSuggestion] Skipped ${product.name}: recent order ${linkedOrder._id} still in-flight (${linkedOrder.status})`);
          return null;
        }
      }
    }

    // 4. Expire any stale ACTIVE suggestions older than 2h before creating new one
    await AiSuggestion.updateMany(
      {
        productId,
        businessId,
        status: 'ACTIVE',
        createdAt: { $lt: twoHoursAgo },
      },
      { $set: { status: 'EXPIRED' } },
    );

    // 5. Build sales history
    let history = [];
    if (product.stockHistory && product.stockHistory.length > 0) {
      for (const entry of product.stockHistory) {
        const dailyAvg = Math.round((entry.quantitySold || 0) / 30);
        for (let d = 0; d < 30; d++) history.push(dailyAvg);
      }
    }
    if (history.length < 14) {
      const avg = Math.max(1, Math.round(product.currentStock / 30) || 1);
      history = Array.from({ length: 30 }, () =>
        Math.max(0, avg + Math.round((Math.random() - 0.5) * avg * 0.4)),
      );
    }

    const leadTimeDays = product.vendorId?.leadTimeDays || 7;

    // 6. Call AI service
    let prediction;
    try {
      prediction = await aiService.predictDemand({
        productId: product._id.toString(),
        salesHistory: history,
        currentStock: product.currentStock,
        leadTimeDays,
      });
    } catch (aiErr) {
      console.warn(`[AutoSuggestion] AI service unavailable for ${product.name}:`, aiErr.message);
      return null; // Non-blocking — don't crash the parent flow
    }

    // 7. LLM context boost (failure-safe)
    try {
      const business = await Business.findById(businessId).select('location industry').lean();
      const llmContext = await detectHealthContext({
        productName: product.name || product.sku,
        city: business?.location || 'unknown',
        industry: business?.industry || 'general',
        category: product.category || '',
      });
      prediction = applyContextBoost(prediction, llmContext);
    } catch (llmErr) {
      console.warn(`[AutoSuggestion] LLM context failed for ${product.name}:`, llmErr.message);
    }

    // 8. Persist the new suggestion
    const suggestion = await AiSuggestion.create({
      productId: product._id,
      predictedDailyDemand: prediction.predictedDailyDemand,
      daysToStockout: prediction.daysToStockout,
      suggestedReorderQty: prediction.suggestedReorderQty,
      confidence: prediction.confidence,
      method: prediction.method,
      inferenceTimeMs: prediction.inferenceTimeMs || null,
      llmContext: prediction.llmContext || null,
      status: 'ACTIVE',
      createdBy: null, // System-generated (not by a specific user)
      businessId,
      snapshot: {
        productName: product.name,
        productSku: product.sku,
        currentStock: product.currentStock,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        leadTimeDays,
      },
    });

    // 9. Emit real-time event
    try {
      const io = getSocket();
      io.emit('ai:suggestion-created', {
        id: suggestion._id,
        productId: product._id,
        productName: product.name,
        daysToStockout: suggestion.daysToStockout,
        suggestedReorderQty: suggestion.suggestedReorderQty,
        confidence: suggestion.confidence,
        autoGenerated: true,
      });
    } catch (socketErr) {
      console.warn('[AutoSuggestion] Socket emit failed:', socketErr.message);
    }

    // 10. Notify all business users about the new auto-suggestion
    try {
      await notifyAllBusinessUsers({
        businessId,
        type: 'REORDER_ALERT',
        title: `Auto reorder suggestion: ${product.name}`,
        message:
          `Stock for ${product.name} (${product.currentStock}/${product.minThreshold}) is below threshold. ` +
          `AI recommends reordering ${suggestion.suggestedReorderQty} units. ` +
          `Stockout in ~${suggestion.daysToStockout} day(s).`,
        referenceId: suggestion._id,
        referenceType: 'AiSuggestion',
        metadata: {
          productId: product._id,
          productName: product.name,
          currentStock: product.currentStock,
          suggestedQty: suggestion.suggestedReorderQty,
          daysToStockout: suggestion.daysToStockout,
          confidence: suggestion.confidence,
          autoGenerated: true,
        },
      });
    } catch (notifErr) {
      console.warn('[AutoSuggestion] Notification failed:', notifErr.message);
    }

    console.log(
      `[AutoSuggestion] Created for ${product.name} (${product.sku}) → ` +
        `demand=${suggestion.predictedDailyDemand} stockout=${suggestion.daysToStockout}d ` +
        `reorder=${suggestion.suggestedReorderQty} conf=${suggestion.confidence}`,
    );

    return suggestion;
  } catch (err) {
    console.error('[AutoSuggestion] Error:', err.message);
    return null; // Never crash the parent flow
  }
}

module.exports = { autoGenerateSuggestionIfNeeded };
