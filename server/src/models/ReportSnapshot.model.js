/**
 * ReportSnapshot Model
 * Caches generated reports with TTL-based expiration.
 * If a snapshot exists and has not expired, serve the cached version.
 */

const mongoose = require('mongoose');

const reportSnapshotSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: ['MONTHLY_SALES', 'INVENTORY_STATUS', 'VENDOR_PERFORMANCE', 'FINANCIAL_SUMMARY'],
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    /** Path to the generated file (if exported to disk) */
    filePath: {
      type: String,
      default: null,
    },
    /** Format of the export */
    format: {
      type: String,
      enum: ['JSON', 'EXCEL', 'PDF'],
      default: 'JSON',
    },
    /** The full report data (JSON snapshot) */
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    /** Metadata: period, filters, etc. */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

reportSnapshotSchema.index({ businessId: 1, reportType: 1, expiresAt: 1 });
reportSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

module.exports = mongoose.model('ReportSnapshot', reportSnapshotSchema);
