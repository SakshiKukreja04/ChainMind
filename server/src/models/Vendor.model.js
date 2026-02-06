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
     * Phone number for communications
     */
    contact: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Vendor email address
     * Used to create login credentials when approved
     */
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
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
     * Vendor onboarding status
     * PENDING → awaiting owner approval
     * APPROVED → active vendor
     * REJECTED → denied by owner
     */
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },

    /**
     * Manager who submitted the vendor request
     */
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /**
     * Array of product names this vendor supplies
     */
    productsSupplied: [
      {
        type: String,
        trim: true,
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
     * Derived from status === 'APPROVED'
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
