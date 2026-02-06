/**
 * Audit Controller
 * Exposes read-only APIs for the cryptographic audit trail.
 *
 * GET  /api/audit/logs            – list audit logs for this business
 * GET  /api/audit/logs/:orderId   – get chain for a specific order
 * GET  /api/audit/verify/:orderId – verify full chain for an order
 * GET  /api/audit/verify/entry/:entryId – verify single entry
 */

const AuditLog = require('../models/AuditLog.model');
const { verifyOrderChain, verifySingleEntry } = require('../services/auditTrail.service');

// ── GET /api/audit/logs ─────────────────────────────────────────
const listAuditLogs = async (req, res) => {
  try {
    const { orderId, limit = 50, page = 1 } = req.query;
    const filter = { businessId: req.user.businessId };
    if (orderId) filter.orderId = orderId;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('orderId', 'status quantity totalValue')
        .populate('createdBy', 'name email')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: logs.length,
      total,
      page: Number(page),
      logs: logs.map(formatLog),
    });
  } catch (err) {
    console.error('listAuditLogs error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/audit/logs/:orderId ────────────────────────────────
const getOrderAuditChain = async (req, res) => {
  try {
    const logs = await AuditLog.find({
      orderId: req.params.orderId,
      businessId: req.user.businessId,
    })
      .sort({ timestamp: 1 })
      .populate('createdBy', 'name email')
      .lean();

    return res.json({
      success: true,
      count: logs.length,
      logs: logs.map(formatLog),
    });
  } catch (err) {
    console.error('getOrderAuditChain error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/audit/verify/:orderId ──────────────────────────────
const verifyOrder = async (req, res) => {
  try {
    // Ensure order belongs to this business
    const exists = await AuditLog.exists({
      orderId: req.params.orderId,
      businessId: req.user.businessId,
    });

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'No audit entries found for this order in your business',
      });
    }

    const result = await verifyOrderChain(req.params.orderId);

    return res.json({
      success: true,
      orderId: req.params.orderId,
      chainValid: result.valid,
      entries: result.entries,
    });
  } catch (err) {
    console.error('verifyOrder error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/audit/verify/entry/:entryId ────────────────────────
const verifyEntry = async (req, res) => {
  try {
    const result = await verifySingleEntry(req.params.entryId);

    if (!result.valid && result.message === 'Entry not found') {
      return res.status(404).json({ success: false, message: 'Audit entry not found' });
    }

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('verifyEntry error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Helpers ─────────────────────────────────────────────────────

function formatLog(log) {
  return {
    id: log._id,
    orderId: log.orderId?._id || log.orderId,
    action: log.action,
    dataHash: log.dataHash,
    previousHash: log.previousHash,
    status: log.status,
    timestamp: log.timestamp,
    createdBy: log.createdBy,
    businessId: log.businessId,
  };
}

module.exports = {
  listAuditLogs,
  getOrderAuditChain,
  verifyOrder,
  verifyEntry,
};
