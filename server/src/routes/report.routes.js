/**
 * Report Routes (mounted at /api/reports)
 *
 * GET    /api/reports/schedules             — List report schedules
 * POST   /api/reports/schedules             — Create a new schedule
 * PUT    /api/reports/schedules/:id         — Update schedule
 * DELETE /api/reports/schedules/:id         — Delete schedule
 * GET    /api/reports/:type                 — Generate / get report JSON
 * GET    /api/reports/:type/download        — Download as Excel or PDF
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { ownerOrManager } = require('../middleware/role.middleware');
const {
  getReport,
  downloadReport,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} = require('../controllers/report.controller');

// Schedule routes (must be before :type param routes)
router.get('/schedules', authMiddleware, ownerOrManager, listSchedules);
router.post('/schedules', authMiddleware, ownerOrManager, createSchedule);
router.put('/schedules/:id', authMiddleware, ownerOrManager, updateSchedule);
router.delete('/schedules/:id', authMiddleware, ownerOrManager, deleteSchedule);

// Report generation & download
router.get('/:type', authMiddleware, ownerOrManager, getReport);
router.get('/:type/download', authMiddleware, ownerOrManager, downloadReport);

module.exports = router;
