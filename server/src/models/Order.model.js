/**
 * Order Model
 * Represents purchase orders for inventory replenishment
 * Includes approval workflow and blockchain audit trail
 */

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    /**
     * Reference to the product being ordered
     * Links to Product model
     */
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    /**
     * Reference to the vendor supplying the product
     * Links to Vendor model
     */
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },

    /**
     * Reference to the vendor catalog item
     * Links to VendorProduct model (null for legacy orders)
     */
    vendorProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProduct',
      default: null,
    },

    /**
     * Order quantity
     * Must be a positive number
     */
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    /**
     * Order status through approval workflow
     * DRAFT: Order created, not submitted
     * PENDING_APPROVAL: Awaiting manager/owner approval
     * APPROVED: Approved, sent to vendor
     * DELIVERED: Product received and stocked
     */
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACCEPTED', 'CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'VENDOR_REJECTED', 'DELAY_REQUESTED'],
      required: true,
      default: 'DRAFT',
    },

    /**
     * Vendor action taken on the order
     * ACCEPT / REJECT / REQUEST_DELAY
     */
    vendorAction: {
      type: String,
      enum: ['ACCEPT', 'REJECT', 'REQUEST_DELAY'],
      default: null,
    },

    /**
     * Reason for delay (if vendor requests a delay)
     */
    delayReason: {
      type: String,
      default: null,
    },

    /**
     * New expected date proposed by vendor on delay request
     */
    newExpectedDate: {
      type: Date,
      default: null,
    },

    /**
     * Date when order was marked in-transit
     */
    inTransitAt: {
      type: Date,
      default: null,
    },

    /**
     * Date when vendor confirmed the order
     */
    confirmedAt: {
      type: Date,
      default: null,
    },

    /**
     * Date when vendor dispatched the order
     */
    dispatchedAt: {
      type: Date,
      default: null,
    },

    /**
     * Date when vendor marked order as delivered
     */
    deliveredAt: {
      type: Date,
      default: null,
    },

    /**
     * User who created/submitted the order
     * Links to User model
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * User who approved the order
     * Only populated when order is APPROVED
     * Links to User model
     */
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /**
     * Blockchain transaction hash
     * Stores blockchain reference for audit trail
     * Populated when order is finalized
     * Used for immutable record keeping
     */
    blockchainTxHash: {
      type: String,
      default: null,
    },

    /**
     * Order total value
     * quantity * costPrice
     */
    totalValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Expected delivery date
     * Calculated as createdAt + Vendor.leadTimeDays
     */
    expectedDeliveryDate: {
      type: Date,
      default: null,
    },

    /**
     * Actual delivery date
     * Populated when order status changes to DELIVERED
     */
    actualDeliveryDate: {
      type: Date,
      default: null,
    },

    /**
     * Rejection reason (if order was rejected)
     */
    rejectionReason: {
      type: String,
      default: null,
    },

    /**
     * Notes or comments on the order
     */
    notes: {
      type: String,
      default: null,
    },

    /**
     * Reference to business this order belongs to
     * Links to Business model
     */
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },

    /**
     * Purchase order number (for external reference)
     */
    poNumber: {
      type: String,
      default: null,
    },

    /**
     * AI recommendation data (stored for analytics)
     */
    aiRecommendation: {
      forecastedDemand: Number,
      recommendedQuantity: Number,
      confidence: Number, // 0-1
      reasoning: String,
    },
  },
  {
    timestamps: true, // Auto-generates createdAt and updatedAt
  }
);

/**
 * Indexes for efficient queries
 */
orderSchema.index({ productId: 1 }); // Product orders
orderSchema.index({ vendorId: 1 }); // Vendor orders
orderSchema.index({ businessId: 1 }); // Business orders
orderSchema.index({ status: 1 }); // Filter by status
orderSchema.index({ createdBy: 1 }); // User orders
orderSchema.index({ businessId: 1, status: 1 }); // Business pending orders
orderSchema.index({ vendorId: 1, status: 1 }); // Vendor + status queries

module.exports = mongoose.model('Order', orderSchema);
