/**
 * User Model
 * Represents platform users with role-based access
 * Roles: OWNER (business owner), MANAGER (staff), VENDOR (supplier)
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    /**
     * User's full name
     */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Unique email address - used for login
     */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      index: true,
    },

    /**
     * Hashed password (bcrypt)
     * Never store plain text passwords
     */
    passwordHash: {
      type: String,
      required: true,
    },

    /**
     * User role defining dashboard access & permissions
     * OWNER: Full business access
     * MANAGER: View-only dashboards, can approve orders
     * VENDOR: Can view own product orders
     */
    role: {
      type: String,
      enum: ['OWNER', 'MANAGER', 'VENDOR'],
      required: true,
      default: 'MANAGER',
    },

    /**
     * Reference to business this user belongs to
     * Links to Business model
     */
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: function() {
        return this.role !== 'VENDOR'; // Vendors may not have businessId initially
      },
    },

    /**
     * Profile photo URL (optional)
     */
    profilePhoto: {
      type: String,
      default: null,
    },

    /**
     * Account active status
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * For VENDOR users: links to their Vendor entity record
     * Set when owner invites a vendor user
     */
    vendorEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },

    /**
     * Force password change on first login (for auto-created vendor accounts)
     */
    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    /**
     * User's phone number (optional)
     */
    phone: {
      type: String,
      default: null,
      trim: true,
    },

    /**
     * Department or team (optional)
     */
    department: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true, // Auto-generates createdAt and updatedAt
  }
);

/**
 * Index for faster queries
 */
userSchema.index({ businessId: 1 });

module.exports = mongoose.model('User', userSchema);
