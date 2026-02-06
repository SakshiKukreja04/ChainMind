/**
 * AuditLog Model
 * Cryptographic audit trail for order lifecycle events.
 * Hash-chained entries provide tamper-evident record keeping
 * without external blockchain dependency.
 *
 * Documents are IMMUTABLE after creation — updates and deletes
 * are prevented by pre-hooks.
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    /** Reference to the order this log entry belongs to */
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    /**
     * Lifecycle action that triggered this entry
     * e.g. ORDER_CREATED, ORDER_APPROVED, ORDER_DISPATCHED, ORDER_DELIVERED
     */
    action: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * SHA-256 hash of the canonically-serialised order data at event time.
     * Serves as the "transaction hash" shown in the UI.
     */
    dataHash: {
      type: String,
      required: true,
    },

    /**
     * dataHash of the PREVIOUS audit-log entry for the same order.
     * null for the first entry in an order's chain (genesis).
     */
    previousHash: {
      type: String,
      default: null,
    },

    /**
     * Verification status.
     * VERIFIED  — recomputed hash matches stored hash
     * PENDING   — not yet verified / hash mismatch detected
     */
    status: {
      type: String,
      enum: ['VERIFIED', 'PENDING'],
      default: 'VERIFIED',
    },

    /** Timestamp of the event (explicit, for display consistency) */
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },

    /** User who triggered the lifecycle event */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /** Business context for scoped queries */
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },

    /**
     * Snapshot of the key order fields at event time.
     * Stored so verification can recompute the hash independently.
     */
    orderSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt (updatedAt should never change)
  },
);

// ── Immutability guards ──────────────────────────────────────────

auditLogSchema.pre('updateOne', function () {
  throw new Error('AuditLog entries are immutable and cannot be updated');
});

auditLogSchema.pre('updateMany', function () {
  throw new Error('AuditLog entries are immutable and cannot be updated');
});

auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('AuditLog entries are immutable and cannot be updated');
});

auditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('AuditLog entries are immutable and cannot be deleted');
});

auditLogSchema.pre('deleteOne', function () {
  throw new Error('AuditLog entries are immutable and cannot be deleted');
});

auditLogSchema.pre('deleteMany', function () {
  throw new Error('AuditLog entries are immutable and cannot be deleted');
});

// ── Indexes ──────────────────────────────────────────────────────

auditLogSchema.index({ orderId: 1, timestamp: 1 }); // chain order per order
auditLogSchema.index({ businessId: 1, timestamp: -1 }); // business-wide listing
auditLogSchema.index({ dataHash: 1 }); // fast lookup by hash

module.exports = mongoose.model('AuditLog', auditLogSchema);
