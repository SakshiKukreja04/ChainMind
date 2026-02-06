/**
 * Reorder Intelligence Service
 * Handles the DELIVERED completion flow:
 *   1. Update product currentStock (already done in controller, but this adds logging)
 *   2. Log delivery to SalesHistory
 *   3. Trigger ML model retrain (background, non-blocking)
 *   4. Emit STOCK_UPDATE notification to SME users
 *   5. Send delivery-acknowledgement email to vendor
 */

const { Product, Vendor, SalesHistory, Business, Order, User } = require('../models');
const { notifyAllBusinessUsers, createNotification } = require('./notificationService');
const { sendDeliveryAcknowledgement, sendReorderConfirmation } = require('./vendorEmailService');
const aiService = require('./aiService');

/**
 * Resolve vendor email — uses populated field first, falls back to DB lookup.
 */
async function resolveVendorWithEmail(vendorRef) {
  if (vendorRef?.email) return vendorRef;

  // Populated object without email, or just an ObjectId — look up from DB
  const vendorId = vendorRef?._id || vendorRef;
  if (!vendorId) return null;

  const vendor = await Vendor.findById(vendorId).select('name email contact').lean();
  return vendor;
}

/**
 * Create a notification for the vendor's User account.
 * Vendor users have vendorEntityId that links them to the Vendor entity.
 */
async function notifyVendorUser(vendorEntityId, businessId, { type, title, message, referenceId, referenceType, metadata }) {
  try {
    const vendorUser = await User.findOne({ vendorEntityId, role: 'VENDOR' }).select('_id').lean();
    if (!vendorUser) {
      console.warn(`[ReorderIntelligence] No VENDOR user found for vendorEntityId=${vendorEntityId}`);
      return null;
    }
    return await createNotification({
      userId: vendorUser._id,
      businessId,
      type,
      title,
      message,
      referenceId,
      referenceType,
      metadata,
    });
  } catch (err) {
    console.warn('[ReorderIntelligence] notifyVendorUser failed:', err.message);
    return null;
  }
}

/**
 * Called after an order transitions to DELIVERED.
 * Performs all side-effects: sales-history logging, retrain, notifications, vendor email.
 *
 * @param {Object} order – Mongoose order document (populated with productId, vendorId)
 * @param {string} businessId
 */
async function onOrderDelivered(order, businessId) {
  const product = order.productId;
  let vendor;

  try {
    vendor = await resolveVendorWithEmail(order.vendorId);
  } catch (err) {
    console.error('[ReorderIntelligence] resolveVendorWithEmail failed:', err.message);
    vendor = order.vendorId; // fallback to populated ref
  }

  console.log(`[ReorderIntelligence] DELIVERED flow started: order=${order._id} product=${product?.name} vendor=${vendor?.name || 'unknown'}`);

  // 1. Log delivery to SalesHistory (for retrain data) — independent
  try {
    await logDeliveryToHistory(order, businessId);
  } catch (err) {
    console.error('[ReorderIntelligence] logDeliveryToHistory failed:', err.message);
  }

  // 2. Trigger model retrain (non-blocking)
  triggerRetrain();

  // 3. Notify SME users (OWNER + MANAGER) about stock update — independent
  try {
    await notifyAllBusinessUsers({
      businessId,
      type: 'STOCK_UPDATE',
      title: `Delivery received: ${product?.name || 'Product'}`,
      message:
        `${order.quantity} units of ${product?.name || 'product'} delivered by ${vendor?.name || 'vendor'}. ` +
        `Stock has been automatically updated.`,
      referenceId: order._id,
      referenceType: 'Order',
      metadata: {
        orderId: order._id,
        productId: product?._id || order.productId,
        productName: product?.name,
        vendorName: vendor?.name,
        quantity: order.quantity,
        previousStock: (product?.currentStock || 0) - order.quantity,
        newStock: product?.currentStock || 0,
      },
    });
    console.log(`[ReorderIntelligence] ✓ STOCK_UPDATE notification sent to business ${businessId}`);
  } catch (err) {
    console.error('[ReorderIntelligence] STOCK_UPDATE notification failed:', err.message);
  }

  // 4. Send acknowledgement email to vendor — independent
  try {
    if (vendor?.email) {
      const business = await Business.findById(businessId).select('businessName').lean();
      const emailResult = await sendDeliveryAcknowledgement({
        vendorEmail: vendor.email,
        vendorName: vendor.name,
        businessName: business?.businessName || 'ChainMind Business',
        productName: product?.name || 'Product',
        quantity: order.quantity,
        orderId: order._id.toString(),
      });
      console.log(`[ReorderIntelligence] ✓ Delivery ack email → ${vendor.email} (msgId: ${emailResult?.MessageID || 'failed'})`);
    } else {
      console.warn(`[ReorderIntelligence] ✗ No vendor email for vendor=${vendor?._id || order.vendorId} — skipping delivery ack`);
    }
  } catch (err) {
    console.error('[ReorderIntelligence] Delivery ack email failed:', err.message);
  }

  // 5. Notify vendor user — independent
  try {
    const vendorEntityId = vendor?._id || order.vendorId?._id || order.vendorId;
    if (vendorEntityId) {
      await notifyVendorUser(vendorEntityId, businessId, {
        type: 'ORDER_STATUS',
        title: `Delivery confirmed: ${product?.name || 'Product'}`,
        message: `Your delivery of ${order.quantity} units of ${product?.name || 'product'} has been confirmed and received.`,
        referenceId: order._id,
        referenceType: 'Order',
        metadata: { orderId: order._id, status: 'DELIVERED', quantity: order.quantity },
      });
    }
  } catch (err) {
    console.error('[ReorderIntelligence] vendor notification (delivered) failed:', err.message);
  }

  console.log(`[ReorderIntelligence] ✓ Delivery completed: ${product?.name} qty=${order.quantity} → all side-effects fired`);
}

/**
 * Called when an order is APPROVED and sent to vendor.
 * Sends reorder confirmation email to vendor + ORDER_STATUS notification to SME.
 */
async function onOrderApproved(order, businessId) {
  const product = order.productId;
  let vendor;

  try {
    vendor = await resolveVendorWithEmail(order.vendorId);
  } catch (err) {
    console.error('[ReorderIntelligence] resolveVendorWithEmail failed:', err.message);
    vendor = order.vendorId; // fallback to populated ref
  }

  console.log(
    `[ReorderIntelligence] APPROVED flow started: order=${order._id} product=${product?.name} ` +
    `vendor=${vendor?.name || 'unknown'} vendorEmail=${vendor?.email || 'MISSING'}`,
  );

  // ── Step 1: Send vendor reorder confirmation email IMMEDIATELY ──
  // This is the highest priority — runs FIRST and independently
  try {
    if (vendor?.email) {
      const business = await Business.findById(businessId).select('businessName currency').lean();
      console.log(`[ReorderIntelligence] Sending reorder email to ${vendor.email} via Postmark...`);
      const emailResult = await sendReorderConfirmation({
        vendorEmail: vendor.email,
        vendorName: vendor.name,
        businessName: business?.businessName || 'ChainMind Business',
        productName: product?.name || 'Product',
        productSku: product?.sku || '',
        quantity: order.quantity,
        totalValue: order.totalValue || 0,
        currency: business?.currency || 'INR',
        expectedDeliveryDate: order.expectedDeliveryDate,
        orderId: order._id.toString(),
        poNumber: order.poNumber,
      });
      console.log(
        `[ReorderIntelligence] ✓ Reorder confirmation email SENT → ${vendor.email} ` +
        `(product=${product?.name}, qty=${order.quantity}, msgId=${emailResult?.MessageID || 'dev-mode'})`,
      );
    } else {
      console.warn(
        `[ReorderIntelligence] ✗ Cannot send reorder email — no email found for vendor ` +
        `id=${vendor?._id || order.vendorId} name=${vendor?.name || 'unknown'}. ` +
        `Please ensure vendor has an email address configured.`,
      );
    }
  } catch (err) {
    console.error('[ReorderIntelligence] ✗ Reorder email FAILED:', err.message);
  }

  // ── Step 2: Notify SME users (OWNER + MANAGER) — independent ──
  try {
    await notifyAllBusinessUsers({
      businessId,
      type: 'ORDER_STATUS',
      title: `Order approved: ${product?.name || 'Product'}`,
      message:
        `Reorder of ${order.quantity} units of ${product?.name || 'product'} has been approved ` +
        `and sent to ${vendor?.name || 'vendor'}.`,
      referenceId: order._id,
      referenceType: 'Order',
      metadata: {
        orderId: order._id,
        status: 'APPROVED',
        productName: product?.name,
        vendorName: vendor?.name,
        quantity: order.quantity,
      },
    });
    console.log(`[ReorderIntelligence] ✓ ORDER_STATUS notification sent to SME users (business=${businessId})`);
  } catch (err) {
    console.error('[ReorderIntelligence] SME notification failed:', err.message);
  }

  // ── Step 3: Notify vendor user (in-app bell) — independent ──
  try {
    const vendorEntityId = vendor?._id || order.vendorId?._id || order.vendorId;
    if (vendorEntityId) {
      await notifyVendorUser(vendorEntityId, businessId, {
        type: 'ORDER_STATUS',
        title: `New order: ${product?.name || 'Product'}`,
        message: `You have a new purchase order for ${order.quantity} units of ${product?.name || 'product'}. Please log in to accept.`,
        referenceId: order._id,
        referenceType: 'Order',
        metadata: { orderId: order._id, status: 'APPROVED', quantity: order.quantity, productName: product?.name },
      });
      console.log(`[ReorderIntelligence] ✓ Vendor in-app notification sent (vendorEntity=${vendorEntityId})`);
    }
  } catch (err) {
    console.error('[ReorderIntelligence] Vendor notification failed:', err.message);
  }

  console.log(`[ReorderIntelligence] ✓ Order approved flow complete: ${product?.name} qty=${order.quantity}`);
}

/**
 * Called when a vendor rejects an order.
 * Notifies SME users about the rejection.
 */
async function onOrderRejected(order, businessId, reason) {
  const product = order.productId;
  const vendor = order.vendorId;

  // Notify SME users — independent
  try {
    await notifyAllBusinessUsers({
      businessId,
      type: 'ORDER_STATUS',
      title: `Order rejected by ${vendor?.name || 'vendor'}`,
      message:
        `${vendor?.name || 'Vendor'} rejected the order for ${order.quantity} units of ` +
        `${product?.name || 'product'}. Reason: ${reason || 'No reason provided'}.`,
      referenceId: order._id,
      referenceType: 'Order',
      metadata: {
        orderId: order._id,
        status: 'VENDOR_REJECTED',
        productName: product?.name,
        vendorName: vendor?.name,
        reason,
      },
    });
    console.log(`[ReorderIntelligence] ✓ REJECTED notification sent to SME users`);
  } catch (err) {
    console.error('[ReorderIntelligence] onOrderRejected SME notification failed:', err.message);
  }

  // Notify vendor user — independent
  try {
    const vendorEntityId = vendor?._id || order.vendorId;
    if (vendorEntityId) {
      await notifyVendorUser(vendorEntityId, businessId, {
        type: 'ORDER_STATUS',
        title: `Order rejected: ${product?.name || 'Product'}`,
        message: `Your rejection of the order for ${order.quantity} units of ${product?.name || 'product'} has been recorded. Reason: ${reason || 'N/A'}`,
        referenceId: order._id,
        referenceType: 'Order',
        metadata: { orderId: order._id, status: 'VENDOR_REJECTED', reason },
      });
    }
  } catch (err) {
    console.error('[ReorderIntelligence] vendor notification (rejected) failed:', err.message);
  }
}

/**
 * Called when a new AI-based reorder is submitted (PENDING_APPROVAL).
 * Notifies OWNER for approval.
 */
async function onReorderSubmitted(order, businessId) {
  const product = order.productId;

  // Notify SME users (OWNER + MANAGER)
  try {
    await notifyAllBusinessUsers({
      businessId,
      type: 'REORDER_ALERT',
      title: `Reorder request: ${product?.name || 'Product'}`,
      message:
        `AI-suggested reorder of ${order.quantity} units of ${product?.name || 'product'} ` +
        `is awaiting approval.`,
      referenceId: order._id,
      referenceType: 'Order',
      metadata: {
        orderId: order._id,
        status: 'PENDING_APPROVAL',
        productName: product?.name,
        quantity: order.quantity,
        aiRecommendation: order.aiRecommendation || null,
      },
    });
    console.log(`[ReorderIntelligence] ✓ REORDER_ALERT notification sent to SME users`);
  } catch (err) {
    console.error('[ReorderIntelligence] onReorderSubmitted notification failed:', err.message);
  }

  // Notify vendor user
  try {
    const vendorId = order.vendorId?._id || order.vendorId;
    if (vendorId) {
      await notifyVendorUser(vendorId, businessId, {
        type: 'REORDER_ALERT',
        title: `Incoming order: ${product?.name || 'Product'}`,
        message: `A reorder of ${order.quantity} units of ${product?.name || 'product'} is pending approval and may be assigned to you.`,
        referenceId: order._id,
        referenceType: 'Order',
        metadata: { orderId: order._id, status: 'PENDING_APPROVAL', quantity: order.quantity },
      });
    }
  } catch (err) {
    console.error('[ReorderIntelligence] vendor notification (submitted) failed:', err.message);
  }
}

// ── Internal helpers ───────────────────────────────────────────

/**
 * Log the delivered quantity as a SalesHistory entry (reverse: restock = negative demand signal).
 * We record it as a restock event so the model knows supply arrived.
 */
async function logDeliveryToHistory(order, businessId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const business = await Business.findById(businessId).select('location').lean();

    await SalesHistory.create({
      productId: order.productId?._id || order.productId,
      businessId,
      vendorId: order.vendorId?._id || order.vendorId,
      date: today,
      quantitySold: 0, // restock event, not a sale
      city: business?.location || 'unknown',
      revenue: 0,
      metadata: {
        type: 'RESTOCK',
        orderId: order._id,
        quantity: order.quantity,
      },
    });

    console.log(`[ReorderIntelligence] Delivery logged to SalesHistory for ${order._id}`);
  } catch (err) {
    console.error('[ReorderIntelligence] logDeliveryToHistory failed:', err.message);
  }
}

/**
 * Trigger ML retrain in background (non-blocking).
 */
function triggerRetrain() {
  aiService
    .retrain()
    .then((res) => console.log('[ReorderIntelligence] Retrain triggered:', res))
    .catch((err) => console.warn('[ReorderIntelligence] Retrain failed (non-blocking):', err.message));
}

module.exports = {
  onOrderDelivered,
  onOrderApproved,
  onOrderRejected,
  onReorderSubmitted,
};
