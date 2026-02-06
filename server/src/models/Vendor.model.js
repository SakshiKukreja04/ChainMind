/**
 * Vendor Model
 * Represents suppliers/vendors that provide products to the business
 * Tracks reliability scores used by AI for vendor ranking
 */

const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    /**
     * Vendor company name
     */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Vendor contact information
     * Email or phone number for communications
     */
    contact: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Average lead time in days
     * How long it takes vendor to deliver products
     */
    leadTimeDays: {
      type: Number,
      required: true,
      min: 0,
      default: 7,
    },

    /**
     * Array of products this vendor supplies
     * References Product model
     */
    productsSupplied: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],

    /**
     * Reliability score (0-100)
     * Updated by AI based on:
     * - On-time delivery rate
     * - Quality of products
     * - Response time
     * Used for vendor ranking & recommendations
     */
    reliabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    /**
     * Reference to business this vendor serves
     * Links to Business model
     */
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },

    /**
     * Payment terms (e.g., NET30, NET60)
     */
    paymentTerms: {
      type: String,
      default: 'NET30',
    },

    /**
     * Vendor rating by business users (1-5 stars)
     */
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },

    /**
     * Total orders placed with this vendor
     */
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Vendor address/location
     */
    address: {
      type: String,
      default: null,
    },

    /**
     * Whether vendor is approved for ordering
     */
    isApproved: {
      type: Boolean,
      default: false,
    },

    /**
     * Vendor account status
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * Performance metrics for AI analysis
     */
    performanceMetrics: {
      onTimeDeliveryRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      qualityScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      responseFintRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for efficient queries
 */
vendorSchema.index({ businessId: 1 }); // Business vendors
vendorSchema.index({ name: 1 });
vendorSchema.index({ reliabilityScore: -1 }); // For vendor ranking

module.exports = mongoose.model('Vendor', vendorSchema);
