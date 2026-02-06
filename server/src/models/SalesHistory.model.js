/**
 * SalesHistory Model
 * Stores daily product sales data per city for demand forecasting.
 *
 * The AI service uses this collection (via the seeder or live data)
 * to train seasonal, location-aware demand models.
 */

const mongoose = require('mongoose');

const salesHistorySchema = new mongoose.Schema(
  {
    /** Product this sale record belongs to */
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    /** Business that owns the product */
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },

    /** Vendor who supplied the product (nullable for direct-sourced) */
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },

    /**
     * Calendar date of the sale (time portion zeroed).
     * One document per product × city × date.
     */
    date: {
      type: Date,
      required: true,
    },

    /** Total units sold on this date */
    quantitySold: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    /**
     * City / location where the sale occurred.
     * Used for location-aware demand bias.
     */
    city: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// Compound indexes for common query patterns
salesHistorySchema.index({ productId: 1, city: 1, date: -1 });  // per-product city timeline
salesHistorySchema.index({ businessId: 1, date: -1 });           // business-wide history
salesHistorySchema.index({ date: 1 });                            // range scans

module.exports = mongoose.model('SalesHistory', salesHistorySchema);
