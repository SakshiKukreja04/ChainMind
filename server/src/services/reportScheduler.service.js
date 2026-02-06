/**
 * Report Scheduler Service
 * Uses node-cron to auto-generate reports based on ReportSchedule documents.
 * Stores snapshots in ReportSnapshots collection.
 *
 * Failure-safe: scheduler failures never crash the server.
 */

let cron;
try {
  cron = require('node-cron');
} catch {
  cron = null;
}

const ReportSchedule = require('../models/ReportSchedule.model');
const { generateReport, cacheSnapshot } = require('./report.service');

/** Map of active cron jobs keyed by schedule._id */
const activeJobs = new Map();

/**
 * Execute a single scheduled report generation.
 */
async function executeSchedule(schedule) {
  try {
    console.log(`[ReportScheduler] Running scheduled report: ${schedule.reportType} for business ${schedule.businessId}`);

    const data = await generateReport(schedule.reportType, schedule.businessId.toString(), { skipCache: true });

    // Cache with 24h TTL for scheduled reports
    await cacheSnapshot(schedule.businessId, schedule.reportType, data, {
      scheduled: true,
      scheduleId: schedule._id,
    }, 24 * 60 * 60 * 1000);

    // Update lastRunAt & nextRunAt
    const now = new Date();
    schedule.lastRunAt = now;

    if (cron && cron.validate(schedule.cronExpression)) {
      // Simple next-run estimation: just note that it ran now
      schedule.nextRunAt = null; // cron handles actual timing
    }

    await ReportSchedule.findByIdAndUpdate(schedule._id, {
      lastRunAt: now,
    });

    console.log(`[ReportScheduler] ✓ Completed: ${schedule.reportType}`);
  } catch (err) {
    console.error(`[ReportScheduler] ✗ Failed: ${schedule.reportType}:`, err.message);
  }
}

/**
 * Start a cron job for a single schedule.
 */
function startJob(schedule) {
  if (!cron) {
    console.warn('[ReportScheduler] node-cron not installed — skipping cron job');
    return;
  }

  const id = schedule._id.toString();

  // Stop existing job if any
  if (activeJobs.has(id)) {
    activeJobs.get(id).stop();
    activeJobs.delete(id);
  }

  if (!schedule.isActive) return;

  if (!cron.validate(schedule.cronExpression)) {
    console.warn(`[ReportScheduler] Invalid cron: "${schedule.cronExpression}" for schedule ${id}`);
    return;
  }

  const job = cron.schedule(schedule.cronExpression, () => {
    executeSchedule(schedule).catch(err => {
      console.error(`[ReportScheduler] Scheduled execution error:`, err.message);
    });
  }, { timezone: 'UTC' });

  activeJobs.set(id, job);
  console.log(`[ReportScheduler] ✓ Job started: ${schedule.reportType} [${schedule.cronExpression}]`);
}

/**
 * Initialize scheduler — load all active schedules and start cron jobs.
 * Call this once after DB connection is established.
 */
async function initScheduler() {
  if (!cron) {
    console.warn('[ReportScheduler] node-cron not available — report scheduling disabled');
    return;
  }

  try {
    const schedules = await ReportSchedule.find({ isActive: true }).lean();
    console.log(`[ReportScheduler] Loading ${schedules.length} active schedule(s)...`);

    for (const s of schedules) {
      startJob(s);
    }
  } catch (err) {
    console.error('[ReportScheduler] Init failed:', err.message);
  }
}

/**
 * Stop all active cron jobs.
 */
function stopAllJobs() {
  for (const [id, job] of activeJobs) {
    job.stop();
  }
  activeJobs.clear();
  console.log('[ReportScheduler] All jobs stopped');
}

module.exports = {
  initScheduler,
  startJob,
  stopAllJobs,
  executeSchedule,
};
