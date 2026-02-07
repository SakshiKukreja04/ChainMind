/**
 * Cooperative Buying Controller
 * Handles HTTP requests for the cooperative buying feature.
 *
 * GET    /api/cooperative/discover/:productId  – Discover opportunities
 * GET    /api/cooperative/open                 – Browse open groups
 * GET    /api/cooperative                      – List my cooperatives
 * GET    /api/cooperative/:id                  – Get single cooperative detail
 * POST   /api/cooperative/create               – Create or join a group
 * POST   /api/cooperative/:id/join             – Join an existing group
 * POST   /api/cooperative/:id/approve          – Approve participation
 * POST   /api/cooperative/:id/select-vendor    – Select vendor (initiator only)
 * POST   /api/cooperative/:id/cancel           – Cancel cooperative (initiator only)
 */

const cooperativeService = require('../services/cooperativeService');

// ─── Discover ─────────────────────────────────────────────────

async function discoverOpportunities(req, res) {
  try {
    const { productId } = req.params;
    const result = await cooperativeService.discoverOpportunities(
      productId,
      req.user.businessId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] discoverOpportunities error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// ─── Browse Open Groups ───────────────────────────────────────

async function getOpenGroups(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await cooperativeService.discoverOpenGroups(
      req.user.businessId,
      { page: Number(page), limit: Number(limit) },
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] getOpenGroups error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// ─── List My Cooperatives ─────────────────────────────────────

async function listCooperatives(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await cooperativeService.listForBusiness(
      req.user.businessId,
      { status, page: Number(page), limit: Number(limit) },
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] listCooperatives error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// ─── Get Detail ───────────────────────────────────────────────

async function getCooperative(req, res) {
  try {
    const result = await cooperativeService.getById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] getCooperative error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// ─── Create ───────────────────────────────────────────────────

async function createCooperative(req, res) {
  try {
    const { productId, requestedQty, notes } = req.body;
    if (!productId || !requestedQty) {
      return res.status(400).json({
        success: false,
        message: 'productId and requestedQty are required',
      });
    }

    const result = await cooperativeService.createOrJoin({
      productId,
      businessId: req.user.businessId,
      ownerId: req.user.userId,
      requestedQty: Number(requestedQty),
      notes,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] createCooperative error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// ─── Join ─────────────────────────────────────────────────────

async function joinCooperative(req, res) {
  try {
    const { productId, requestedQty } = req.body;
    if (!productId || !requestedQty) {
      return res.status(400).json({
        success: false,
        message: 'productId and requestedQty are required',
      });
    }

    const result = await cooperativeService.createOrJoin({
      productId,
      businessId: req.user.businessId,
      ownerId: req.user.userId,
      requestedQty: Number(requestedQty),
      cooperativeId: req.params.id,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] joinCooperative error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// ─── Approve ──────────────────────────────────────────────────

async function approveParticipation(req, res) {
  try {
    const result = await cooperativeService.approveParticipation(
      req.params.id,
      req.user.businessId,
      req.user.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] approveParticipation error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// ─── Select Vendor ────────────────────────────────────────────

async function selectVendor(req, res) {
  try {
    const { vendorId } = req.body;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'vendorId is required',
      });
    }

    const result = await cooperativeService.selectVendor(
      req.params.id,
      vendorId,
      req.user.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] selectVendor error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// ─── Cancel ───────────────────────────────────────────────────

async function cancelCooperative(req, res) {
  try {
    const result = await cooperativeService.cancelCooperative(
      req.params.id,
      req.user.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] cancelCooperative error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// ─── Vendor Pricing ───────────────────────────────────────────

async function getVendorPricing(req, res) {
  try {
    const { id, vendorId } = req.params;
    const result = await cooperativeService.getVendorPricing(id, vendorId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[CooperativeCtrl] getVendorPricing error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

module.exports = {
  discoverOpportunities,
  getOpenGroups,
  listCooperatives,
  getCooperative,
  createCooperative,
  joinCooperative,
  approveParticipation,
  selectVendor,
  cancelCooperative,
  getVendorPricing,
};
