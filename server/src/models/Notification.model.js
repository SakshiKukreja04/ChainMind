/**
 * Notification Model
 * In-app notifications for SME owners/managers
 * Types: REORDER_ALERT, AI_NUDGE, STOCK_UPDATE, ORDER_STATUS
 *
 * ❌  NO emails to SME users — socket-only delivery
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    /** Target user (OWNER / MANAGER) */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** Business context */
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },

    /** Notification category */
    type: {
      type: String,
      enum: ['REORDER_ALERT', 'AI_NUDGE', 'STOCK_UPDATE', 'ORDER_STATUS'],
      required: true,
    },

    /** Short headline shown in the bell dropdown */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    /** Longer description / reason */
    message: {
      type: String,
      required: true,
      trim: true,
    },

    /** Optional reference to a related entity for deep-linking */
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    /** Entity type for the referenceId (e.g. 'Order', 'Product') */
    referenceType: {
      type: String,
      enum: ['Order', 'Product', 'AiSuggestion', 'CooperativeBuy', null],
      default: null,
    },

    /** Read / unread state */
    read: {
      type: Boolean,
      default: false,
    },

    /** Extra metadata (confidence, boost %, etc.) */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// Compound indexes for fast bell-icon queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
