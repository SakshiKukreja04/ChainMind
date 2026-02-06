/**
 * Product Model
 * Represents inventory items managed by a business
 * Includes pricing, stock levels, and vendor relationships
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    /**
     * Product name/description
     */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Stock Keeping Unit - unique product identifier
     * Indexed for fast lookups
     */
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    /**
     * Product category for organization
     */
    category: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Cost price (what business pays supplier)
     * Must be non-negative
     */
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Selling price (retail price)
     * Must be non-negative
     */
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Current stock quantity on hand
     * Must be non-negative
     */
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    /**
     * Minimum stock level before alerting
     * Used by AI forecasting for reorder suggestions
     */
    minThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },

    /**
     * Reference to supplier (Vendor)
     * Links to Vendor model
     */
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },

    /**
     * Reference to business that owns this product
     * Links to Business model
     */
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },

    /**
     * Product description
     */
    description: {
      type: String,
      default: null,
    },

    /**
     * Product image URL
     */
    imageUrl: {
      type: String,
      default: null,
    },

    /**
     * Whether product is actively sold
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * Historical stock data for AI analysis
     * Stores monthly turnover for demand forecasting
     */
    stockHistory: [
      {
        month: Date,
        quantitySold: Number,
        revenue: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for common queries
 */
productSchema.index({ businessId: 1 }); // Business inventory
productSchema.index({ vendorId: 1 }); // Vendor's products
productSchema.index({ businessId: 1, sku: 1 }); // Compound index for fast business-product lookup

module.exports = mongoose.model('Product', productSchema);
