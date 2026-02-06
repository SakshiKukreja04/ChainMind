/**
 * AI Suggestion Controller
 * Handles demand forecasting suggestions for the Inventory Manager.
 *
 * Endpoints:
 *   POST /api/inventory/:productId/ai-suggestion – Generate AI suggestion
 *   GET  /api/inventory/ai-suggestions            – List all suggestions
 *   GET  /api/inventory/ai-suggestions/:id        – Get single suggestion
 */

const { Product, AiSuggestion, Business } = require('../models');
const aiService = require('../services/aiService');
const { detectHealthContext, applyContextBoost } = require('../services/llmContextService');
const { getSocket } = require('../sockets');

// ── POST /api/inventory/:productId/ai-suggestion ────────────────
const generateSuggestion = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Find the product
    const product = await Product.findOne({
      _id: productId,
      businessId: req.user.businessId,
    }).populate('vendorId');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // 2. Duplicate guard — block if an ACTIVE suggestion exists within 24h
    // 2. Expire any older ACTIVE suggestions for this product (replace with fresh one)
    await AiSuggestion.updateMany(
      {
        productId,
        businessId: req.user.businessId,
        status: 'ACTIVE',
      },
      { $set: { status: 'EXPIRED' } },
    );

    // 3. Build sales history from product stockHistory
    let history = [];
    if (product.stockHistory && product.stockHistory.length > 0) {
      for (const entry of product.stockHistory) {
        const dailyAvg = Math.round((entry.quantitySold || 0) / 30);
        for (let d = 0; d < 30; d++) history.push(dailyAvg);
      }
    }
    // Fallback: synthetic history
    if (history.length < 14) {
      const avg = Math.max(1, Math.round(product.currentStock / 30));
      history = Array.from({ length: 30 }, () =>
        Math.max(0, avg + Math.round((Math.random() - 0.5) * avg * 0.4))
      );
    }

    const leadTimeDays = product.vendorId?.leadTimeDays || 7;

    // 4. Call AI service
    let prediction;
    try {
      prediction = await aiService.predictDemand({
        productId: product._id.toString(),
        salesHistory: history,
        currentStock: product.currentStock,
        leadTimeDays,
      });
    } catch (aiErr) {
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable — please try again later',
        error: aiErr.message,
      });
    }

    // 4b. LLM health-context awareness (failure-safe)
    const business = await Business.findById(req.user.businessId).select('location industry').lean();
    const llmContext = await detectHealthContext({
      productName: product.name || product.sku,
      city: business?.location || 'unknown',
      industry: business?.industry || 'general',
      category: product.category || '',
    });
    prediction = applyContextBoost(prediction, llmContext);

    // 5. Persist suggestion in MongoDB
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
      createdBy: req.user.userId,
      businessId: req.user.businessId,
      snapshot: {
        productName: product.name,
        productSku: product.sku,
        currentStock: product.currentStock,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        leadTimeDays,
      },
    });

    // 6. Emit real-time event
    try {
      const io = getSocket();
      io.emit('ai:suggestion-created', {
        id: suggestion._id,
        productId: product._id,
        productName: product.name,
        daysToStockout: suggestion.daysToStockout,
        suggestedReorderQty: suggestion.suggestedReorderQty,
        confidence: suggestion.confidence,
      });
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    console.log(
      `[AI-Suggestion] Created for ${product.name} (${product.sku}) → ` +
      `demand=${suggestion.predictedDailyDemand} stockout=${suggestion.daysToStockout}d ` +
      `reorder=${suggestion.suggestedReorderQty} conf=${suggestion.confidence}`
    );

    return res.status(201).json({
      success: true,
      suggestion: {
        id: suggestion._id,
        productId: suggestion.productId,
        predictedDailyDemand: suggestion.predictedDailyDemand,
        daysToStockout: suggestion.daysToStockout,
        suggestedReorderQty: suggestion.suggestedReorderQty,
        confidence: suggestion.confidence,
        method: suggestion.method,
        inferenceTimeMs: suggestion.inferenceTimeMs,
        llmContext: suggestion.llmContext || null,
        status: suggestion.status,
        snapshot: suggestion.snapshot,
        createdAt: suggestion.createdAt,
      },
    });
  } catch (err) {
    console.error('generateSuggestion error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/inventory/ai-suggestions ───────────────────────────
const listSuggestions = async (req, res) => {
  try {
    const { status } = req.query; // optional filter: ACTIVE | SUBMITTED | EXPIRED
    const filter = { businessId: req.user.businessId };
    if (status) filter.status = status;

    const suggestions = await AiSuggestion.find(filter)
      .sort({ createdAt: -1 })
      .populate('productId', 'name sku currentStock costPrice sellingPrice')
      .populate('createdBy', 'name email')
      .lean();

    return res.json({
      success: true,
      count: suggestions.length,
      suggestions: suggestions.map((s) => ({
        id: s._id,
        productId: s.productId?._id || s.productId,
        productName: s.productId?.name || s.snapshot?.productName,
        productSku: s.productId?.sku || s.snapshot?.productSku,
        currentStock: s.productId?.currentStock ?? s.snapshot?.currentStock,
        costPrice: s.productId?.costPrice ?? s.snapshot?.costPrice,
        sellingPrice: s.productId?.sellingPrice ?? s.snapshot?.sellingPrice,
        predictedDailyDemand: s.predictedDailyDemand,
        daysToStockout: s.daysToStockout,
        suggestedReorderQty: s.suggestedReorderQty,
        confidence: s.confidence,
        method: s.method,
        inferenceTimeMs: s.inferenceTimeMs,
        llmContext: s.llmContext || null,
        status: s.status,
        orderId: s.orderId,
        createdBy: s.createdBy,
        snapshot: s.snapshot,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error('listSuggestions error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/inventory/ai-suggestions/:id ───────────────────────
const getSuggestion = async (req, res) => {
  try {
    const suggestion = await AiSuggestion.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    })
      .populate('productId', 'name sku currentStock costPrice sellingPrice')
      .populate('createdBy', 'name email');

    if (!suggestion) {
      return res.status(404).json({ success: false, message: 'Suggestion not found' });
    }

    return res.json({ success: true, suggestion });
  } catch (err) {
    console.error('getSuggestion error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { generateSuggestion, listSuggestions, getSuggestion };
