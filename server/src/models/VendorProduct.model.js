/**
 * VendorProduct Model
 * Represents items in a vendor's product catalog.
 * Only the owning vendor can create/update; SME OWNER & MANAGER can read.
 */

const mongoose = require('mongoose');

const vendorProductSchema = new mongoose.Schema(
  {
    /** Owning vendor */
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },

    /** Product display name */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /** Stock-keeping unit (unique per vendor) */
    sku: {
      type: String,
      required: true,
      trim: true,
    },

    /** Product category */
    category: {
      type: String,
      trim: true,
      default: 'General',
    },

    /** Unit price in local currency */
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Minimum order quantity */
    minOrderQty: {
      type: Number,
      default: 1,
      min: 1,
    },

    /** Vendor-specific lead time for this product (days) */
    leadTimeDays: {
      type: Number,
      default: 7,
      min: 0,
    },

    /** Whether this catalog item is available for ordering */
    isActive: {
      type: Boolean,
      default: true,
    },

    /** Business this catalog belongs to (same as vendor's businessId) */
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/** Compound unique: one SKU per vendor */
vendorProductSchema.index({ vendorId: 1, sku: 1 }, { unique: true });
vendorProductSchema.index({ vendorId: 1, isActive: 1 });
vendorProductSchema.index({ businessId: 1, isActive: 1 });

module.exports = mongoose.model('VendorProduct', vendorProductSchema);
