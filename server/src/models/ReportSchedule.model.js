/**
 * ReportSchedule Model
 * Stores cron-based schedules for auto-generating reports.
 */

const mongoose = require('mongoose');

const reportScheduleSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    reportType: {
      type: String,
      enum: ['MONTHLY_SALES', 'INVENTORY_STATUS', 'VENDOR_PERFORMANCE', 'FINANCIAL_SUMMARY'],
      required: true,
    },
    /** Cron expression (e.g. '0 8 1 * *' = 8am on 1st of every month) */
    cronExpression: {
      type: String,
      required: true,
    },
    /** Export format */
    format: {
      type: String,
      enum: ['JSON', 'EXCEL', 'PDF'],
      default: 'PDF',
    },
    /** Whether schedule is active */
    isActive: {
      type: Boolean,
      default: true,
    },
    /** Last time the schedule triggered */
    lastRunAt: {
      type: Date,
      default: null,
    },
    /** Next expected run */
    nextRunAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

reportScheduleSchema.index({ businessId: 1, isActive: 1 });
reportScheduleSchema.index({ isActive: 1, nextRunAt: 1 });

module.exports = mongoose.model('ReportSchedule', reportScheduleSchema);
