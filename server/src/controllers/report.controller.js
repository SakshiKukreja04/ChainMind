/**
 * Report Controller
 * REST endpoints for generating, downloading, and scheduling reports.
 *
 * GET  /api/reports/:type              — Generate/get report JSON (cached)
 * GET  /api/reports/:type/download     — Download as Excel or PDF
 * GET  /api/reports/schedules          — List schedules
 * POST /api/reports/schedules          — Create schedule
 * PUT  /api/reports/schedules/:id      — Update schedule
 * DELETE /api/reports/schedules/:id    — Delete schedule
 */

const { generateReport } = require('../services/report.service');
const { exportToExcel } = require('../utils/excelExporter');
const { exportToPdf } = require('../utils/pdfExporter');
const ReportSchedule = require('../models/ReportSchedule.model');

const VALID_TYPES = ['MONTHLY_SALES', 'INVENTORY_STATUS', 'VENDOR_PERFORMANCE', 'FINANCIAL_SUMMARY'];

const TYPE_FILENAMES = {
  MONTHLY_SALES: 'monthly-sales-report',
  INVENTORY_STATUS: 'inventory-status-report',
  VENDOR_PERFORMANCE: 'vendor-performance-report',
  FINANCIAL_SUMMARY: 'financial-summary-report',
};

// ─── GET /api/reports/:type ───────────────────────────────────

const getReport = async (req, res) => {
  try {
    const reportType = (req.params.type || '').toUpperCase().replace(/-/g, '_');
    if (!VALID_TYPES.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Valid: ${VALID_TYPES.join(', ')}`,
      });
    }

    const businessId = req.user.businessId;
    const months = parseInt(req.query.months) || 12;
    const skipCache = req.query.fresh === 'true';

    const data = await generateReport(reportType, businessId, { months, skipCache });

    return res.json({ success: true, report: data });
  } catch (err) {
    console.error('[ReportController] getReport error:', err);
    return res.status(500).json({ success: false, message: 'Report generation failed' });
  }
};

// ─── GET /api/reports/:type/download ──────────────────────────

const downloadReport = async (req, res) => {
  try {
    const reportType = (req.params.type || '').toUpperCase().replace(/-/g, '_');
    if (!VALID_TYPES.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Valid: ${VALID_TYPES.join(', ')}`,
      });
    }

    const format = (req.query.format || 'excel').toLowerCase();
    if (!['excel', 'pdf'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Format must be "excel" or "pdf"' });
    }

    const businessId = req.user.businessId;
    const months = parseInt(req.query.months) || 12;

    // Always generate fresh data for downloads
    const data = await generateReport(reportType, businessId, { months, skipCache: true });

    const filename = TYPE_FILENAMES[reportType] || 'report';
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'excel') {
      const buffer = await exportToExcel(reportType, data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${timestamp}.xlsx"`);
      return res.send(buffer);
    }

    // PDF
    const buffer = await exportToPdf(reportType, data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-${timestamp}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('[ReportController] downloadReport error:', err);
    return res.status(500).json({ success: false, message: 'Report download failed' });
  }
};

// ─── GET /api/reports/schedules ───────────────────────────────

const listSchedules = async (req, res) => {
  try {
    const schedules = await ReportSchedule.find({ businessId: req.user.businessId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: schedules.length,
      schedules: schedules.map(s => ({
        id: s._id,
        reportType: s.reportType,
        cronExpression: s.cronExpression,
        format: s.format,
        isActive: s.isActive,
        lastRunAt: s.lastRunAt,
        nextRunAt: s.nextRunAt,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error('[ReportController] listSchedules error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list schedules' });
  }
};

// ─── POST /api/reports/schedules ──────────────────────────────

const createSchedule = async (req, res) => {
  try {
    const { reportType, cronExpression, format } = req.body;

    if (!reportType || !VALID_TYPES.includes(reportType)) {
      return res.status(400).json({ success: false, message: `reportType must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (!cronExpression) {
      return res.status(400).json({ success: false, message: 'cronExpression is required' });
    }

    const schedule = await ReportSchedule.create({
      businessId: req.user.businessId,
      reportType,
      cronExpression,
      format: format || 'PDF',
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Schedule created',
      schedule: {
        id: schedule._id,
        reportType: schedule.reportType,
        cronExpression: schedule.cronExpression,
        format: schedule.format,
        isActive: schedule.isActive,
      },
    });
  } catch (err) {
    console.error('[ReportController] createSchedule error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create schedule' });
  }
};

// ─── PUT /api/reports/schedules/:id ───────────────────────────

const updateSchedule = async (req, res) => {
  try {
    const { cronExpression, format, isActive } = req.body;

    const updates = {};
    if (cronExpression) updates.cronExpression = cronExpression;
    if (format) updates.format = format;
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const schedule = await ReportSchedule.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId },
      updates,
      { new: true },
    ).lean();

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    return res.json({
      success: true,
      schedule: {
        id: schedule._id,
        reportType: schedule.reportType,
        cronExpression: schedule.cronExpression,
        format: schedule.format,
        isActive: schedule.isActive,
      },
    });
  } catch (err) {
    console.error('[ReportController] updateSchedule error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update schedule' });
  }
};

// ─── DELETE /api/reports/schedules/:id ────────────────────────

const deleteSchedule = async (req, res) => {
  try {
    const result = await ReportSchedule.findOneAndDelete({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    return res.json({ success: true, message: 'Schedule deleted' });
  } catch (err) {
    console.error('[ReportController] deleteSchedule error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete schedule' });
  }
};

module.exports = {
  getReport,
  downloadReport,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
