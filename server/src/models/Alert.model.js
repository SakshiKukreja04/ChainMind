/**
 * Alert Model
 * Represents stock threshold alerts for a business
 */

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    /**
     * Reference to the product triggering the alert
     */
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    /**
     * Reference to the business this alert belongs to
     */
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },

    /**
     * Alert type
     */
    type: {
      type: String,
      enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'STOCK_CORRECTED'],
      required: true,
    },

    /**
     * Severity level
     */
    severity: {
      type: String,
      enum: ['LOW', 'CRITICAL'],
      required: true,
    },

    /**
     * Human-readable alert message
     */
    message: {
      type: String,
      required: true,
    },

    /**
     * Current stock at time of alert
     */
    currentStock: {
      type: Number,
      default: 0,
    },

    /**
     * Threshold that was breached
     */
    minThreshold: {
      type: Number,
      default: 0,
    },

    /**
     * Whether the alert has been read/acknowledged
     */
    read: {
      type: Boolean,
      default: false,
    },

    /**
     * Whether the alert is still active
     */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ businessId: 1, isActive: 1 });
alertSchema.index({ productId: 1 });

module.exports = mongoose.model('Alert', alertSchema);
