/**
 * Order Controller
 * Handles the full order lifecycle:
 *   1. AI-based reorder submission (Inventory Manager)
 *   2. Pending order listing (SME Owner)
 *   3. Approve / Reject (SME Owner)
 *   4. List all orders (Owner or Manager)
 */

const { Order, Product, AiSuggestion, Vendor, VendorProduct, Alert, Business, CooperativeBuy } = require('../models');
const User = require('../models/User.model');
const { getSocket } = require('../sockets');
const { updateVendorScore, recalculateReliabilityScore } = require('../services/vendorScore.service');
const { recordAuditEntry } = require('../services/auditTrail.service');
const { onOrderDelivered, onOrderApproved, onOrderRejected, onReorderSubmitted } = require('../services/reorderIntelligenceService');
const { autoGenerateSuggestionIfNeeded } = require('../services/autoSuggestionService');
const { createNotification } = require('../services/notificationService');

/**
 * Helper: resolve the Vendor entity linked to a VENDOR user
 * Checks vendorEntityId first, then falls back to email/contact match
 */
async function resolveVendorForUser(user) {
  // 1. Direct link via vendorEntityId
  if (user.vendorEntityId) {
    const v = await Vendor.findById(user.vendorEntityId);
    if (v) return v;
  }

  // 2. Look up User record for vendorEntityId (req.user may be from JWT)
  const fullUser = await User.findById(user.userId || user._id);
  if (fullUser?.vendorEntityId) {
    const v = await Vendor.findById(fullUser.vendorEntityId);
    if (v) return v;
  }

  // 3. Fallback: match vendor contact to user email
  const v = await Vendor.findOne({
    businessId: user.businessId,
    contact: fullUser?.email || user.email,
  });
  return v || null;
}

// ── POST /api/orders/ai-reorder ─────────────────────────────────
const submitAiReorder = async (req, res) => {
  try {
    const { productId, aiSuggestionId, finalQuantity, vendorId, vendorProductId } = req.body;

    if (!productId || !aiSuggestionId || !finalQuantity || !vendorId) {
      return res.status(400).json({
        success: false,
        message: 'productId, aiSuggestionId, finalQuantity, and vendorId are required',
      });
    }

    if (finalQuantity < 1) {
      return res.status(400).json({ success: false, message: 'finalQuantity must be ≥ 1' });
    }

    // 1. Validate AI suggestion exists and belongs to this business
    const suggestion = await AiSuggestion.findOne({
      _id: aiSuggestionId,
      businessId: req.user.businessId,
      status: 'ACTIVE',
    });

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'AI suggestion not found or already submitted',
      });
    }

    // 2. Validate product
    const product = await Product.findOne({
      _id: productId,
      businessId: req.user.businessId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // 2b. Validate vendor belongs to the same business and is approved
    const vendor = await Vendor.findOne({
      _id: vendorId,
      businessId: req.user.businessId,
      isApproved: true,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Approved vendor not found for this business',
      });
    }

    // 2c. Validate vendorProductId if provided
    let vendorProduct = null;
    if (vendorProductId) {
      vendorProduct = await VendorProduct.findOne({
        _id: vendorProductId,
        vendorId: vendor._id,
        isActive: true,
      });
      if (!vendorProduct) {
        return res.status(404).json({
          success: false,
          message: 'Vendor catalog product not found or inactive',
        });
      }
      if (finalQuantity < vendorProduct.minOrderQty) {
        return res.status(400).json({
          success: false,
          message: `Quantity must be ≥ ${vendorProduct.minOrderQty} (vendor minimum)`,
        });
      }
    }

    // 3. Calculate total value from vendorProduct price if available
    const unitCost = vendorProduct ? vendorProduct.unitPrice : (product.costPrice || 0);
    const leadTime = vendorProduct ? vendorProduct.leadTimeDays : vendor.leadTimeDays;

    // 4. Create Order with PENDING_APPROVAL status
    const order = await Order.create({
      productId: product._id,
      vendorId: vendor._id,
      vendorProductId: vendorProduct?._id || null,
      quantity: finalQuantity,
      status: 'PENDING_APPROVAL',
      createdBy: req.user.userId,
      businessId: req.user.businessId,
      totalValue: finalQuantity * unitCost,
      expectedDeliveryDate: leadTime
        ? new Date(Date.now() + leadTime * 24 * 60 * 60 * 1000)
        : null,
      aiRecommendation: {
        forecastedDemand: suggestion.predictedDailyDemand,
        recommendedQuantity: suggestion.suggestedReorderQty,
        confidence: suggestion.confidence,
        reasoning: `AI predicted ${suggestion.predictedDailyDemand} units/day demand. ` +
                   `Stock-out in ${suggestion.daysToStockout} days. ` +
                   `Method: ${suggestion.method}, Confidence: ${(suggestion.confidence * 100).toFixed(0)}%` +
                   (suggestion.llmContext?.contextBoostApplied
                     ? `. Context boost: ${suggestion.llmContext.reason}`
                     : ''),
        llmContext: suggestion.llmContext || null,
      },
    });

    // 4. Link suggestion to order
    suggestion.status = 'SUBMITTED';
    suggestion.orderId = order._id;
    await suggestion.save();

    // 5. Emit Socket event to SME Owner
    try {
      const io = getSocket();
      io.emit('order:pending-approval', {
        id: order._id,
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: order.quantity,
        aiSuggestedQty: suggestion.suggestedReorderQty,
        confidence: suggestion.confidence,
        daysToStockout: suggestion.daysToStockout,
        totalValue: order.totalValue,
        status: order.status,
        vendorProductId: order.vendorProductId || null,
      });
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    // Audit trail
    recordAuditEntry(order, 'ORDER_CREATED', req.user.userId, req.user.businessId);

    // Notify SME users about new reorder request
    onReorderSubmitted(
      { ...order.toObject(), productId: product, vendorId: vendor },
      req.user.businessId,
    );

    console.log(
      `[Order] AI-reorder submitted: ${product.name} qty=${finalQuantity} ` +
      `vendor=${vendor.name} (AI suggested ${suggestion.suggestedReorderQty}) → PENDING_APPROVAL`
    );

    return res.status(201).json({
      success: true,
      message: 'Reorder submitted for approval',
      order: {
        id: order._id,
        productId: order.productId,
        productName: product.name,
        vendorId: vendor._id,
        vendorName: vendor.name,
        vendorProductId: order.vendorProductId || null,
        quantity: order.quantity,
        totalValue: order.totalValue,
        status: order.status,
        aiRecommendation: order.aiRecommendation,
        expectedDeliveryDate: order.expectedDeliveryDate,
        createdAt: order.createdAt,
      },
    });
  } catch (err) {
    console.error('submitAiReorder error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/orders ─────────────────────────────────────────────
const listOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { businessId: req.user.businessId };
    if (status) filter.status = status;

    const [orders, business] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .populate('productId', 'name sku currentStock costPrice sellingPrice')
        .populate('vendorId', 'name contact leadTimeDays')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .lean(),
      Business.findById(req.user.businessId).select('currency').lean(),
    ]);

    const currency = business?.currency || 'USD';

    return res.json({
      success: true,
      count: orders.length,
      currency,
      orders: orders.map((o) => ({
        id: o._id,
        productId: o.productId?._id || o.productId,
        productName: o.productId?.name || 'Unknown',
        productSku: o.productId?.sku || '',
        vendorId: o.vendorId?._id || o.vendorId,
        vendorName: o.vendorId?.name || 'Unassigned',
        quantity: o.quantity,
        totalValue: o.totalValue,
        status: o.status,
        aiRecommendation: o.aiRecommendation,
        expectedDeliveryDate: o.expectedDeliveryDate,
        actualDeliveryDate: o.actualDeliveryDate,
        confirmedAt: o.confirmedAt,
        dispatchedAt: o.dispatchedAt,
        rejectionReason: o.rejectionReason,
        delayReason: o.delayReason || null,
        newExpectedDate: o.newExpectedDate || null,
        vendorAction: o.vendorAction || null,
        notes: o.notes,
        createdBy: o.createdBy,
        approvedBy: o.approvedBy,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
    });
  } catch (err) {
    console.error('listOrders error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/orders/pending ─────────────────────────────────────
const getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      businessId: req.user.businessId,
      status: 'PENDING_APPROVAL',
    })
      .sort({ createdAt: -1 })
      .populate('productId', 'name sku currentStock costPrice sellingPrice')
      .populate('vendorId', 'name contact leadTimeDays')
      .populate('createdBy', 'name email')
      .lean();

    return res.json({
      success: true,
      count: orders.length,
      orders: orders.map((o) => ({
        id: o._id,
        productId: o.productId?._id || o.productId,
        productName: o.productId?.name || 'Unknown',
        productSku: o.productId?.sku || '',
        vendorId: o.vendorId?._id || o.vendorId,
        vendorName: o.vendorId?.name || 'Unassigned',
        quantity: o.quantity,
        totalValue: o.totalValue,
        status: o.status,
        aiRecommendation: o.aiRecommendation,
        expectedDeliveryDate: o.expectedDeliveryDate,
        createdBy: o.createdBy,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    console.error('getPendingOrders error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/orders/:id/approve ────────────────────────────────
const approveOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
      status: 'PENDING_APPROVAL',
    })
      .populate('productId', 'name sku')
      .populate('vendorId', 'name email contact leadTimeDays');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pending order not found',
      });
    }

    order.status = 'APPROVED';
    order.approvedBy = req.user.userId;
    await order.save();

    // Assign vendor to product if not yet assigned
    if (order.vendorId && order.productId) {
      await Product.findOneAndUpdate(
        { _id: order.productId._id || order.productId, vendorId: null },
        { vendorId: order.vendorId._id || order.vendorId }
      );
    }

    // Emit socket event
    try {
      const io = getSocket();
      io.emit('order:approved', {
        id: order._id,
        productName: order.productId?.name,
        quantity: order.quantity,
        status: 'APPROVED',
        approvedBy: req.user.userId,
      });
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    // Audit trail
    recordAuditEntry(order, 'ORDER_APPROVED', req.user.userId, req.user.businessId);

    // Reorder Intelligence: notify SME + email vendor
    onOrderApproved(order, req.user.businessId);

    console.log(`[Order] Approved: ${order.productId?.name} qty=${order.quantity}`);

    return res.json({
      success: true,
      message: 'Order approved',
      order: {
        id: order._id,
        productName: order.productId?.name,
        vendorName: order.vendorId?.name || 'Unassigned',
        quantity: order.quantity,
        totalValue: order.totalValue,
        status: order.status,
      },
    });
  } catch (err) {
    console.error('approveOrder error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/orders/:id/reject ─────────────────────────────────
const rejectOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
      status: 'PENDING_APPROVAL',
    })
      .populate('productId', 'name sku')
      .populate('vendorId', 'name email contact leadTimeDays');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pending order not found',
      });
    }

    order.status = 'REJECTED';
    order.rejectionReason = reason || null;
    await order.save();

    // Emit socket event
    try {
      const io = getSocket();
      io.emit('order:rejected', {
        id: order._id,
        productName: order.productId?.name,
        quantity: order.quantity,
        status: 'REJECTED',
        reason: reason || null,
      });
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    // Audit trail
    recordAuditEntry(order, 'ORDER_REJECTED', req.user.userId, req.user.businessId);

    console.log(`[Order] Rejected: ${order.productId?.name} qty=${order.quantity}`);

    return res.json({
      success: true,
      message: 'Order rejected',
      order: {
        id: order._id,
        productName: order.productId?.name,
        vendorName: order.vendorId?.name || 'Unassigned',
        quantity: order.quantity,
        status: order.status,
        rejectionReason: order.rejectionReason,
      },
    });
  } catch (err) {
    console.error('rejectOrder error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/orders/vendor ──────────────────────────────────────
// Vendor sees orders assigned to them (APPROVED, CONFIRMED, DISPATCHED, DELIVERED)
const getVendorOrders = async (req, res) => {
  try {
    // Find Vendor record linked to this user's businessId
    const vendor = await resolveVendorForUser(req.user);

    if (!vendor) {
      return res.json({ success: true, count: 0, orders: [] });
    }

    const { status } = req.query;
    const filter = { vendorId: vendor._id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('productId', 'name sku currentStock costPrice sellingPrice')
      .populate('vendorId', 'name contact leadTimeDays')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('cooperativeBuyId', 'productName totalQuantity participants status estimatedSavingsPercent')
      .lean();

    return res.json({
      success: true,
      count: orders.length,
      orders: orders.map((o) => ({
        id: o._id,
        productId: o.productId?._id || o.productId,
        productName: o.productId?.name || 'Unknown',
        productSku: o.productId?.sku || '',
        vendorId: o.vendorId?._id || o.vendorId,
        vendorName: o.vendorId?.name || 'Unassigned',
        quantity: o.quantity,
        totalValue: o.totalValue,
        status: o.status,
        aiRecommendation: o.aiRecommendation,
        expectedDeliveryDate: o.expectedDeliveryDate,
        actualDeliveryDate: o.actualDeliveryDate,
        confirmedAt: o.confirmedAt,
        dispatchedAt: o.dispatchedAt,
        rejectionReason: o.rejectionReason,
        delayReason: o.delayReason || null,
        newExpectedDate: o.newExpectedDate || null,
        vendorAction: o.vendorAction || null,
        cooperativeBuyId: o.cooperativeBuyId?._id || o.cooperativeBuyId || null,
        cooperativeBuy: o.cooperativeBuyId && typeof o.cooperativeBuyId === 'object' ? {
          id: o.cooperativeBuyId._id,
          productName: o.cooperativeBuyId.productName,
          totalQuantity: o.cooperativeBuyId.totalQuantity,
          participantCount: o.cooperativeBuyId.participants?.length || 0,
          status: o.cooperativeBuyId.status,
          estimatedSavingsPercent: o.cooperativeBuyId.estimatedSavingsPercent,
        } : null,
        createdBy: o.createdBy,
        approvedBy: o.approvedBy,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        notes: o.notes || null,
      })),
    });
  } catch (err) {
    console.error('getVendorOrders error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/orders/:id/confirm ────────────────────────────────
// Vendor confirms the order (APPROVED → CONFIRMED)
const confirmOrder = async (req, res) => {
  try {
    const vendor = await resolveVendorForUser(req.user);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor record not found' });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: vendor._id,
      status: 'APPROVED',
    })
      .populate('productId', 'name sku')
      .populate('vendorId', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Approved order not found for this vendor' });
    }

    order.status = 'CONFIRMED';
    order.confirmedAt = new Date();
    await order.save();

    try {
      const io = getSocket();
      io.emit('order:confirmed', {
        id: order._id,
        productName: order.productId?.name,
        vendorName: order.vendorId?.name,
        quantity: order.quantity,
        status: 'CONFIRMED',
      });
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    console.log(`[Order] Confirmed by vendor: ${order.productId?.name} qty=${order.quantity}`);

    return res.json({
      success: true,
      message: 'Order confirmed',
      order: {
        id: order._id,
        productName: order.productId?.name,
        vendorName: order.vendorId?.name,
        quantity: order.quantity,
        status: order.status,
        confirmedAt: order.confirmedAt,
      },
    });
  } catch (err) {
    console.error('confirmOrder error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/orders/:id/dispatch ───────────────────────────────
// Vendor dispatches the order (CONFIRMED → DISPATCHED)
const dispatchOrder = async (req, res) => {
  try {
    const vendor = await resolveVendorForUser(req.user);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor record not found' });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: vendor._id,
      status: 'CONFIRMED',
    })
      .populate('productId', 'name sku')
      .populate('vendorId', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Confirmed order not found for this vendor' });
    }

    order.status = 'DISPATCHED';
    order.dispatchedAt = new Date();
    await order.save();

    try {
      const io = getSocket();
      io.emit('order:dispatched', {
        id: order._id,
        productName: order.productId?.name,
        vendorName: order.vendorId?.name,
        quantity: order.quantity,
        status: 'DISPATCHED',
      });
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    console.log(`[Order] Dispatched by vendor: ${order.productId?.name} qty=${order.quantity}`);

    return res.json({
      success: true,
      message: 'Order dispatched',
      order: {
        id: order._id,
        productName: order.productId?.name,
        vendorName: order.vendorId?.name,
        quantity: order.quantity,
        status: order.status,
        dispatchedAt: order.dispatchedAt,
      },
    });
  } catch (err) {
    console.error('dispatchOrder error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/orders/:id/received ───────────────────────────────
// Owner marks order as received (DISPATCHED → DELIVERED) + updates reliability
const markOrderReceived = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
      status: 'DISPATCHED',
    })
      .populate('productId', 'name sku currentStock')
      .populate('vendorId', 'name email leadTimeDays');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Dispatched order not found' });
    }

    order.status = 'DELIVERED';
    order.actualDeliveryDate = new Date();
    order.deliveredAt = new Date();
    await order.save();

    // Update product stock and assign vendor if not yet set
    if (order.productId) {
      const product = await Product.findById(order.productId._id || order.productId);
      if (product) {
        product.currentStock += order.quantity;
        // Update status based on threshold
        if (product.currentStock <= 0) product.status = 'out-of-stock';
        else if (product.currentStock <= product.minThreshold) product.status = 'low-stock';
        else product.status = 'in-stock';
        // Assign vendor if product doesn't have one yet
        if (!product.vendorId && order.vendorId) {
          product.vendorId = order.vendorId._id || order.vendorId;
        }
        await product.save();
      }
    }

    // Update vendor reliability score
    if (order.vendorId) {
      const vendor = await Vendor.findById(order.vendorId._id || order.vendorId);
      if (vendor) {
        vendor.totalOrders = (vendor.totalOrders || 0) + 1;

        // Check on-time delivery
        const isOnTime = !order.expectedDeliveryDate || order.actualDeliveryDate <= order.expectedDeliveryDate;
        const prevOnTime = (vendor.performanceMetrics?.onTimeDeliveryRate || 0) / 100 * ((vendor.totalOrders || 1) - 1);
        const newOnTimeCount = prevOnTime + (isOnTime ? 1 : 0);
        const newOnTimeRate = Math.round((newOnTimeCount / vendor.totalOrders) * 100);

        vendor.performanceMetrics = vendor.performanceMetrics || {};
        vendor.performanceMetrics.onTimeDeliveryRate = newOnTimeRate;

        // Reliability score = weighted average
        vendor.reliabilityScore = Math.round(
          newOnTimeRate * 0.6 +
          (vendor.performanceMetrics.qualityScore || 50) * 0.3 +
          (vendor.performanceMetrics.responseFintRate || 50) * 0.1
        );

        await vendor.save();

        // Emit score update
        try {
          const io = getSocket();
          io.emit('vendor:score-updated', {
            vendorId: vendor._id,
            name: vendor.name,
            reliabilityScore: vendor.reliabilityScore,
            totalOrders: vendor.totalOrders,
            onTimeDeliveryRate: newOnTimeRate,
          });
        } catch (socketErr) {
          console.warn('Socket emit failed:', socketErr.message);
        }

        console.log(
          `[Vendor] Reliability updated: ${vendor.name} score=${vendor.reliabilityScore} ` +
          `onTime=${newOnTimeRate}% orders=${vendor.totalOrders}`
        );
      }
    }

    // Emit delivered event
    try {
      const io = getSocket();
      io.emit('order:delivered', {
        id: order._id,
        productName: order.productId?.name,
        vendorName: order.vendorId?.name,
        quantity: order.quantity,
        status: 'DELIVERED',
      });
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    // Audit trail
    recordAuditEntry(order, 'ORDER_DELIVERED', req.user.userId, req.user.businessId);

    // Reorder Intelligence: log history, retrain, notify, email vendor
    onOrderDelivered(order, req.user.businessId);

    // Auto-generate new AI suggestion if stock is still below threshold
    if (order.productId) {
      autoGenerateSuggestionIfNeeded(
        order.productId._id || order.productId,
        req.user.businessId,
      ).catch((e) => console.warn('Auto-suggestion check failed:', e.message));
    }

    console.log(`[Order] Received: ${order.productId?.name} qty=${order.quantity} → stock updated`);

    return res.json({
      success: true,
      message: 'Order received and stock updated',
      order: {
        id: order._id,
        productName: order.productId?.name,
        vendorName: order.vendorId?.name,
        quantity: order.quantity,
        status: order.status,
        actualDeliveryDate: order.actualDeliveryDate,
      },
    });
  } catch (err) {
    console.error('markOrderReceived error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/orders/:id/vendor-action ──────────────────────────
// Vendor performs action on approved order: ACCEPT, REJECT, REQUEST_DELAY
const vendorOrderAction = async (req, res) => {
  try {
    const vendor = await resolveVendorForUser(req.user);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor record not found' });
    }

    const { action, reason, newExpectedDate } = req.body;
    if (!action || !['ACCEPT', 'REJECT', 'REQUEST_DELAY'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be ACCEPT, REJECT, or REQUEST_DELAY',
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: vendor._id,
      status: 'APPROVED',
    })
      .populate('productId', 'name sku')
      .populate('vendorId', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Approved order not found for this vendor',
      });
    }

    order.vendorAction = action;

    if (action === 'ACCEPT') {
      order.status = 'CONFIRMED';
      order.confirmedAt = new Date();
    } else if (action === 'REJECT') {
      order.status = 'VENDOR_REJECTED';
      order.rejectionReason = reason || 'Rejected by vendor';
      // Penalise vendor score for rejecting
      updateVendorScore(vendor._id, 'CANCELLED').catch((e) =>
        console.warn('Score update failed:', e.message),
      );
    } else if (action === 'REQUEST_DELAY') {
      order.status = 'DELAY_REQUESTED';
      order.delayReason = reason || 'Vendor requested delay';
      if (newExpectedDate) order.newExpectedDate = new Date(newExpectedDate);
    }

    await order.save();

    const eventPayload = {
      id: order._id,
      productName: order.productId?.name,
      vendorName: order.vendorId?.name,
      quantity: order.quantity,
      status: order.status,
      action,
      reason: order.rejectionReason || order.delayReason || null,
    };

    try {
      const io = getSocket();
      io.emit('order:status-change', eventPayload);
      // Dedicated event so owner/manager pages can show a targeted toast
      if (action === 'REJECT') {
        io.emit('order:vendor-rejected', eventPayload);
      } else if (action === 'REQUEST_DELAY') {
        io.emit('order:delay-requested', eventPayload);
      }
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    console.log(`[Order] Vendor action ${action}: ${order.productId?.name} qty=${order.quantity}`);

    // Reorder Intelligence: notify SME about vendor rejection
    if (action === 'REJECT') {
      onOrderRejected(order, order.businessId, order.rejectionReason);
    }

    // ── Cooperative Buy: notify all participants on vendor ACCEPT ────
    if (action === 'ACCEPT' && order.cooperativeBuyId) {
      try {
        const coop = await CooperativeBuy.findById(order.cooperativeBuyId).lean();
        if (coop) {
          for (const p of coop.participants) {
            await createNotification({
              userId: p.ownerId,
              businessId: p.businessId,
              type: 'ORDER_STATUS',
              title: 'Cooperative Order Confirmed by Vendor',
              message: `${order.vendorId?.name || 'Vendor'} has accepted the cooperative bulk order for ${order.quantity} units of ${order.productId?.name || coop.productName}. Expected delivery: ${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'TBD'}.`,
              referenceId: coop._id,
              referenceType: 'CooperativeBuy',
            });
          }
        }
      } catch (coopErr) {
        console.warn('Cooperative ACCEPT notification error:', coopErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Order ${action.toLowerCase().replace('_', ' ')} successful`,
      order: eventPayload,
    });
  } catch (err) {
    console.error('vendorOrderAction error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── PATCH /api/orders/:id/delivery-status ───────────────────────
// Vendor updates delivery status: DISPATCHED → IN_TRANSIT → DELIVERED
const updateDeliveryStatus = async (req, res) => {
  try {
    const vendor = await resolveVendorForUser(req.user);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor record not found' });
    }

    const { deliveryStatus } = req.body;
    const validStatuses = ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'];
    if (!deliveryStatus || !validStatuses.includes(deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: 'deliveryStatus must be DISPATCHED, IN_TRANSIT, or DELIVERED',
      });
    }

    // Valid transition map
    const transitions = {
      CONFIRMED: ['DISPATCHED'],
      DISPATCHED: ['IN_TRANSIT'],
      IN_TRANSIT: ['DELIVERED'],
    };

    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: vendor._id,
    })
      .populate('productId', 'name sku currentStock costPrice')
      .populate('vendorId', 'name email contact leadTimeDays');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for this vendor' });
    }

    const allowed = transitions[order.status] || [];
    if (!allowed.includes(deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${order.status} to ${deliveryStatus}`,
      });
    }

    // Apply status change + timestamp
    order.status = deliveryStatus;
    if (deliveryStatus === 'DISPATCHED') order.dispatchedAt = new Date();
    if (deliveryStatus === 'IN_TRANSIT') order.inTransitAt = new Date();
    if (deliveryStatus === 'DELIVERED') {
      order.actualDeliveryDate = new Date();
      order.deliveredAt = new Date();

      // Update product stock
      if (order.productId) {
        const product = await Product.findById(order.productId._id || order.productId);
        if (product) {
          product.currentStock += order.quantity;
          if (product.currentStock <= 0) product.status = 'out-of-stock';
          else if (product.currentStock <= product.minThreshold) product.status = 'low-stock';
          else product.status = 'in-stock';
          await product.save();
        }
      }

      // Update vendor reliability score
      const isOnTime =
        !order.expectedDeliveryDate || order.actualDeliveryDate <= order.expectedDeliveryDate;
      updateVendorScore(vendor._id, isOnTime ? 'ON_TIME' : 'DELAYED').catch((e) =>
        console.warn('Score update failed:', e.message),
      );
      updateVendorScore(vendor._id, 'COMPLETED').catch((e) =>
        console.warn('Score update failed:', e.message),
      );
    }

    await order.save();

    const eventPayload = {
      id: order._id,
      productName: order.productId?.name,
      vendorName: order.vendorId?.name,
      quantity: order.quantity,
      status: order.status,
      deliveryStatus,
      dispatchedAt: order.dispatchedAt,
      inTransitAt: order.inTransitAt,
      actualDeliveryDate: order.actualDeliveryDate,
    };

    try {
      const io = getSocket();
      io.emit('delivery:update', eventPayload);
      if (deliveryStatus === 'DELIVERED') {
        io.emit('order:delivered', eventPayload);
      }
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    console.log(
      `[Delivery] ${deliveryStatus}: ${order.productId?.name} qty=${order.quantity} vendor=${order.vendorId?.name}`,
    );

    // Reorder Intelligence: fire all DELIVERED side-effects
    if (deliveryStatus === 'DELIVERED') {
      onOrderDelivered(order, order.businessId);
    }

    // ── Cooperative Buy: final delivery notifications + status update ──
    if (deliveryStatus === 'DELIVERED' && order.cooperativeBuyId) {
      try {
        const coop = await CooperativeBuy.findById(order.cooperativeBuyId);
        if (coop) {
          coop.status = 'DELIVERED';
          await coop.save();

          const vendorName = order.vendorId?.name || 'Vendor';
          const productName = order.productId?.name || coop.productName;
          const pricePerUnit = order.totalValue && order.quantity
            ? (order.totalValue / order.quantity).toFixed(2)
            : 'N/A';
          const savings = coop.estimatedSavingsPercent || 0;
          const deliveryDate = order.actualDeliveryDate
            ? new Date(order.actualDeliveryDate).toLocaleDateString()
            : new Date().toLocaleDateString();

          for (const p of coop.participants) {
            const isInitiator = String(p.ownerId) === String(coop.initiatedBy);
            await createNotification({
              userId: p.ownerId,
              businessId: p.businessId,
              type: 'ORDER_STATUS',
              title: isInitiator
                ? 'Cooperative Buy Complete!'
                : 'Cooperative Order Delivered',
              message: `${vendorName} has delivered ${order.quantity} units of ${productName}. ` +
                `Price: $${pricePerUnit}/unit. ` +
                (savings > 0 ? `Estimated savings: ${savings}%. ` : '') +
                `Delivered on ${deliveryDate}. ` +
                `Your share: ${p.requestedQty} units.`,
              referenceId: coop._id,
              referenceType: 'CooperativeBuy',
            });
          }
        }
      } catch (coopErr) {
        console.warn('Cooperative DELIVERED notification error:', coopErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Delivery status updated to ${deliveryStatus}`,
      order: eventPayload,
    });
  } catch (err) {
    console.error('updateDeliveryStatus error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/orders/vendor/performance ──────────────────────────
// Vendor gets their own performance metrics
const getVendorPerformance = async (req, res) => {
  try {
    const vendor = await resolveVendorForUser(req.user);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor record not found' });
    }

    // Count orders by status
    const orderCounts = await Order.aggregate([
      { $match: { vendorId: vendor._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    orderCounts.forEach((o) => { countMap[o._id] = o.count; });

    return res.json({
      success: true,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        reliabilityScore: vendor.reliabilityScore,
        totalOrders: vendor.totalOrders || 0,
        rating: vendor.rating,
        performanceMetrics: vendor.performanceMetrics || {},
        orderBreakdown: {
          approved: countMap.APPROVED || 0,
          confirmed: countMap.CONFIRMED || 0,
          dispatched: countMap.DISPATCHED || 0,
          inTransit: countMap.IN_TRANSIT || 0,
          delivered: countMap.DELIVERED || 0,
          rejected: (countMap.REJECTED || 0) + (countMap.VENDOR_REJECTED || 0),
        },
      },
    });
  } catch (err) {
    console.error('getVendorPerformance error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════════════════════════
// PUT /api/vendor/orders/:orderId/status
// Unified vendor order-status update with reliability + stock + sockets
// ═══════════════════════════════════════════════════════════════
const VENDOR_TRANSITIONS = {
  APPROVED:   'ACCEPTED',
  ACCEPTED:   'DISPATCHED',
  DISPATCHED: 'DELIVERED',
};

const vendorUpdateOrderStatus = async (req, res) => {
  try {
    // ── Resolve vendor entity ──────────────────────────────
    const vendor = await resolveVendorForUser(req.user);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor record not found' });
    }

    const { status: newStatus } = req.body;
    if (!newStatus || !['ACCEPTED', 'DISPATCHED', 'DELIVERED'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'status must be ACCEPTED, DISPATCHED, or DELIVERED',
      });
    }

    // ── Load order (must belong to this vendor) ────────────
    const order = await Order.findOne({
      _id: req.params.orderId,
      vendorId: vendor._id,
    })
      .populate('productId', 'name sku currentStock minThreshold costPrice')
      .populate('vendorId', 'name email contact leadTimeDays');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for this vendor' });
    }

    // ── Validate transition ────────────────────────────────
    const expectedNext = VENDOR_TRANSITIONS[order.status];
    if (expectedNext !== newStatus) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${order.status} to ${newStatus}. Expected: ${expectedNext || 'N/A'}`,
      });
    }

    // ── Apply status + timestamps ──────────────────────────
    order.status = newStatus;

    if (newStatus === 'ACCEPTED') {
      order.confirmedAt = new Date();
    }
    if (newStatus === 'DISPATCHED') {
      order.dispatchedAt = new Date();
    }
    if (newStatus === 'DELIVERED') {
      order.deliveredAt = new Date();
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    // ── DELIVERED side-effects ──────────────────────────────
    if (newStatus === 'DELIVERED') {
      // 1. Increase product stock
      if (order.productId) {
        const product = await Product.findById(order.productId._id || order.productId);
        if (product) {
          const prevStock = product.currentStock;
          product.currentStock += order.quantity;
          await product.save();

          // Emit stock:update
          try {
            const io = getSocket();
            io.emit('stock:update', {
              productId: product._id,
              productName: product.name,
              sku: product.sku,
              previousStock: prevStock,
              currentStock: product.currentStock,
              addedQty: order.quantity,
              businessId: order.businessId,
            });
          } catch {}

          // 2. Resolve LOW_STOCK / OUT_OF_STOCK alerts if stock is now above threshold
          if (product.currentStock >= product.minThreshold) {
            const resolved = await Alert.updateMany(
              {
                productId: product._id,
                businessId: order.businessId,
                type: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
                isActive: true,
              },
              { $set: { isActive: false } },
            );

            if (resolved.modifiedCount > 0) {
              try {
                const io = getSocket();
                io.emit('alert:resolved', {
                  productId: product._id,
                  productName: product.name,
                  currentStock: product.currentStock,
                  minThreshold: product.minThreshold,
                  businessId: order.businessId,
                  resolvedCount: resolved.modifiedCount,
                });
              } catch {}
            }
          }
        }
      }

      // 3. Recalculate vendor reliability score
      recalculateReliabilityScore(vendor._id).catch((e) =>
        console.warn('Reliability recalc failed:', e.message),
      );
    }

    // ── Socket.IO emissions ────────────────────────────────
    const socketPayload = {
      orderId: order._id,
      status: order.status,
      vendorId: vendor._id,
      businessId: order.businessId,
    };

    try {
      const io = getSocket();
      // Broadcast to SME Owner & Inventory Manager
      io.emit('order:status-change', socketPayload);

      // Extra delivery event for SME Owner dashboard
      if (newStatus === 'DISPATCHED' || newStatus === 'DELIVERED') {
        io.emit('vendor:delivery-update', {
          ...socketPayload,
          vendorName: order.vendorId?.name,
          productName: order.productId?.name,
          dispatchedAt: order.dispatchedAt,
          deliveredAt: order.deliveredAt,
          actualDeliveryDate: order.actualDeliveryDate,
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    // Audit trail
    const auditAction = `ORDER_${newStatus}`;
    recordAuditEntry(order, auditAction, req.user.userId, order.businessId);

    console.log(
      `[Order] Vendor status update: ${order.productId?.name} → ${newStatus} (vendor=${vendor.name})`,
    );

    // Reorder Intelligence: fire all DELIVERED side-effects
    if (newStatus === 'DELIVERED') {
      onOrderDelivered(order, order.businessId);

      // Auto-generate new AI suggestion if stock is still below threshold
      if (order.productId) {
        autoGenerateSuggestionIfNeeded(
          order.productId._id || order.productId,
          order.businessId,
        ).catch((e) => console.warn('Auto-suggestion check failed:', e.message));
      }
    }

    // ── Cooperative Buy: notify participants on ACCEPTED / DELIVERED ──
    if (order.cooperativeBuyId && (newStatus === 'ACCEPTED' || newStatus === 'DELIVERED')) {
      try {
        const coop = newStatus === 'DELIVERED'
          ? await CooperativeBuy.findById(order.cooperativeBuyId)
          : await CooperativeBuy.findById(order.cooperativeBuyId).lean();

        if (coop) {
          if (newStatus === 'DELIVERED') {
            coop.status = 'DELIVERED';
            await coop.save();
          }

          const vendorName = order.vendorId?.name || 'Vendor';
          const productName = order.productId?.name || coop.productName;

          for (const p of coop.participants) {
            const isInitiator = String(p.ownerId) === String(coop.initiatedBy);

            if (newStatus === 'ACCEPTED') {
              await createNotification({
                userId: p.ownerId,
                businessId: p.businessId,
                type: 'ORDER_STATUS',
                title: 'Cooperative Order Confirmed by Vendor',
                message: `${vendorName} has accepted the cooperative bulk order for ${order.quantity} units of ${productName}. Expected delivery: ${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'TBD'}.`,
                referenceId: coop._id,
                referenceType: 'CooperativeBuy',
              });
            } else if (newStatus === 'DELIVERED') {
              const pricePerUnit = order.totalValue && order.quantity
                ? (order.totalValue / order.quantity).toFixed(2)
                : 'N/A';
              const savings = coop.estimatedSavingsPercent || 0;
              const deliveryDate = order.actualDeliveryDate
                ? new Date(order.actualDeliveryDate).toLocaleDateString()
                : new Date().toLocaleDateString();

              await createNotification({
                userId: p.ownerId,
                businessId: p.businessId,
                type: 'ORDER_STATUS',
                title: isInitiator ? 'Cooperative Buy Complete!' : 'Cooperative Order Delivered',
                message: `${vendorName} has delivered ${order.quantity} units of ${productName}. ` +
                  `Price: $${pricePerUnit}/unit. ` +
                  (savings > 0 ? `Estimated savings: ${savings}%. ` : '') +
                  `Delivered on ${deliveryDate}. Your share: ${p.requestedQty} units.`,
                referenceId: coop._id,
                referenceType: 'CooperativeBuy',
              });
            }
          }
        }
      } catch (coopErr) {
        console.warn(`Cooperative ${newStatus} notification error:`, coopErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      order: {
        id: order._id,
        productName: order.productId?.name,
        vendorName: order.vendorId?.name,
        quantity: order.quantity,
        totalValue: order.totalValue,
        status: order.status,
        confirmedAt: order.confirmedAt,
        dispatchedAt: order.dispatchedAt,
        deliveredAt: order.deliveredAt,
        actualDeliveryDate: order.actualDeliveryDate,
        expectedDeliveryDate: order.expectedDeliveryDate,
      },
    });
  } catch (err) {
    console.error('vendorUpdateOrderStatus error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/owner/orders/tracking
// Owner sees DISPATCHED + DELIVERED orders with vendor & timestamps
// ═══════════════════════════════════════════════════════════════
const getOwnerOrderTracking = async (req, res) => {
  try {
    const orders = await Order.find({
      businessId: req.user.businessId,
      status: { $in: ['DISPATCHED', 'DELIVERED'] },
    })
      .sort({ updatedAt: -1 })
      .populate('productId', 'name sku currentStock')
      .populate('vendorId', 'name contact leadTimeDays reliabilityScore')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return res.json({
      success: true,
      count: orders.length,
      orders: orders.map((o) => ({
        id: o._id,
        productId: o.productId?._id || o.productId,
        productName: o.productId?.name || 'Unknown',
        productSku: o.productId?.sku || '',
        vendorId: o.vendorId?._id || o.vendorId,
        vendorName: o.vendorId?.name || 'Unassigned',
        vendorReliabilityScore: o.vendorId?.reliabilityScore ?? null,
        quantity: o.quantity,
        totalValue: o.totalValue,
        status: o.status,
        expectedDeliveryDate: o.expectedDeliveryDate,
        actualDeliveryDate: o.actualDeliveryDate,
        confirmedAt: o.confirmedAt,
        dispatchedAt: o.dispatchedAt,
        deliveredAt: o.deliveredAt,
        createdBy: o.createdBy,
        approvedBy: o.approvedBy,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
    });
  } catch (err) {
    console.error('getOwnerOrderTracking error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  submitAiReorder,
  listOrders,
  getPendingOrders,
  approveOrder,
  rejectOrder,
  getVendorOrders,
  confirmOrder,
  dispatchOrder,
  markOrderReceived,
  vendorOrderAction,
  updateDeliveryStatus,
  getVendorPerformance,
  vendorUpdateOrderStatus,
  getOwnerOrderTracking,
};
