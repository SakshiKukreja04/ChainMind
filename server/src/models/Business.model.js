/**
 * Business Model
 * Represents a business account on ChainMind
 * Each business has an owner (OWNER role user) and can have managers
 */

const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    /**
     * Official business name
     */
    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Industry classification (e.g., Retail, Manufacturing, Distribution)
     */
    industry: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Business location/address
     */
    location: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Currency for financial transactions
     * (e.g., USD, INR, EUR)
     */
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
    },

    /**
     * Reference to the OWNER user who created this business
     * Links to User model
     */
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * Business registration number (optional)
     */
    registrationNumber: {
      type: String,
      default: null,
    },

    /**
     * Contact phone number
     */
    phone: {
      type: String,
      default: null,
    },

    /**
     * Business logo URL
     */
    logo: {
      type: String,
      default: null,
    },

    /**
     * Whether business is active on platform
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * Additional metadata
     */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Auto-generates createdAt and updatedAt
  }
);

/**
 * Indexes for faster queries
 */
businessSchema.index({ ownerId: 1 });
businessSchema.index({ businessName: 1 });

module.exports = mongoose.model('Business', businessSchema);
