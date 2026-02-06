/**
 * CooperativeBuy Model
 * Represents a cooperative buying group where multiple SME businesses
 * pool their demand for the same product to negotiate better bulk pricing.
 *
 * Lifecycle:  PROPOSED → APPROVED → ORDERED → DELIVERED | CANCELLED
 *
 * productSpecHash links products that are "the same item" across businesses.
 */

const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    requestedQty: {
      type: Number,
      required: true,
      min: 1,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true },
);

const cooperativeBuySchema = new mongoose.Schema(
  {
    /** SHA-256 hash of normalised (name, category, unitSize) */
    productSpecHash: {
      type: String,
      required: true,
      index: true,
    },

    /** Human-readable label (from the originating product) */
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    unitSize: {
      type: String,
      default: null,
      trim: true,
    },

    /** Participating businesses */
    participants: [participantSchema],

    /** Computed from participants */
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Estimated savings percentage from bulk pricing */
    estimatedSavingsPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    /**
     * Lifecycle status:
     *   PROPOSED   – created by first interested owner, waiting for others
     *   APPROVED   – all participants approved, ready for vendor selection
     *   ORDERED    – order placed with selected vendor
     *   DELIVERED  – vendor delivered, cooperative cycle complete
     *   CANCELLED  – cooperative was cancelled by initiator or timeout
     */
    status: {
      type: String,
      enum: ['PROPOSED', 'APPROVED', 'ORDERED', 'DELIVERED', 'CANCELLED'],
      default: 'PROPOSED',
      required: true,
      index: true,
    },

    /** The owner who initiated this cooperative group */
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Business of the initiator */
    initiatedByBusiness: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },

    /** Selected vendor for the bulk order */
    selectedVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },

    /** Vendor product offering selected for this cooperative buy */
    selectedVendorProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProduct',
      default: null,
    },

    /** Linked order once ORDERED */
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },

    /** Vendor suggestions found during discovery */
    vendorSuggestions: [
      {
        vendorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vendor',
        },
        vendorProductId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'VendorProduct',
        },
        vendorName: String,
        unitPrice: Number,
        bulkPrice: Number,
        minOrderQty: Number,
        leadTimeDays: Number,
      },
    ],

    /** Notes / reason for cooperative buy */
    notes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Compound indexes
cooperativeBuySchema.index({ productSpecHash: 1, status: 1 });
cooperativeBuySchema.index({ 'participants.businessId': 1 });
cooperativeBuySchema.index({ 'participants.ownerId': 1 });
cooperativeBuySchema.index({ initiatedBy: 1 });
cooperativeBuySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('CooperativeBuy', cooperativeBuySchema);
