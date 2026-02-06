/**
 * Cooperative Buying Service
 * Business logic for discovering, creating, joining, approving,
 * and finalising cooperative buying groups.
 *
 * Discovery:
 *   – Hash the requesting product's (name, category)
 *   – Find other businesses' products with the same specHash
 *   – Filter to products whose stock ≤ minThreshold (needing reorder)
 *   – Return matchable businesses + any active/proposed cooperative groups
 *
 * Create / Join:
 *   – If no cooperative exists for that specHash, create one
 *   – Otherwise add the new business as a participant
 *
 * Approve:
 *   – Each participant's owner approves their portion
 *   – When all approve → status moves to APPROVED
 *
 * Select Vendor:
 *   – Owner picks a vendor from vendorSuggestions
 *   – Status moves to ORDERED
 *
 * Finalise / Cancel:
 *   – Mark DELIVERED or CANCELLED
 */

const CooperativeBuy = require('../models/CooperativeBuy.model');
const { Product, Business, Vendor, VendorProduct } = require('../models');
const { generateSpecHash } = require('../utils/productSpecHash');
const { createNotification } = require('./notificationService');

// ─── Discovery ────────────────────────────────────────────────

/**
 * Discover cooperative buying opportunities for a given product.
 *
 * @param {string} productId    – the product the caller wants to reorder
 * @param {string} businessId   – the caller's business
 * @returns {Object} { specHash, matches, existingGroups, vendorOptions }
 */
async function discoverOpportunities(productId, businessId) {
  const product = await Product.findById(productId).lean();
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });

  const specHash = generateSpecHash({
    name: product.name,
    category: product.category,
  });

  // Find matching products in OTHER businesses
  const matchingProducts = await Product.find({
    businessId: { $ne: businessId },
    isActive: true,
  }).lean();

  // Filter by specHash match
  const matches = matchingProducts.filter((p) => {
    const h = generateSpecHash({ name: p.name, category: p.category });
    return h === specHash;
  });

  // Enrich with business info
  const businessIds = [...new Set(matches.map((m) => String(m.businessId)))];
  const businesses = await Business.find({ _id: { $in: businessIds }, isActive: true }).lean();
  const bizMap = Object.fromEntries(businesses.map((b) => [String(b._id), b]));

  const enrichedMatches = matches
    .filter((m) => bizMap[String(m.businessId)])
    .map((m) => {
      const biz = bizMap[String(m.businessId)];
      return {
        productId: m._id,
        productName: m.name,
        category: m.category,
        currentStock: m.currentStock,
        minThreshold: m.minThreshold,
        needsReorder: m.currentStock <= m.minThreshold,
        businessId: biz._id,
        businessName: biz.businessName,
        location: biz.location,
        industry: biz.industry,
      };
    });

  // Find existing cooperative groups for this specHash that are still joinable
  const existingGroups = await CooperativeBuy.find({
    productSpecHash: specHash,
    status: { $in: ['PROPOSED', 'APPROVED'] },
  })
    .populate('participants.businessId', 'businessName location')
    .populate('participants.ownerId', 'name email')
    .populate('initiatedBy', 'name email')
    .populate('initiatedByBusiness', 'businessName location')
    .lean();

  // Find vendor options — search across ALL businesses' vendor pools
  // Vendors are scoped per-business, so collect from caller + matched businesses
  const allBusinessIds = [businessId, ...businessIds];
  const approvedVendors = await Vendor.find({
    businessId: { $in: allBusinessIds },
    status: 'APPROVED',
  }).lean();
  const approvedVendorIds = approvedVendors.map((v) => String(v._id));
  const vendorProducts = await VendorProduct.find({
    vendorId: { $in: approvedVendorIds },
    category: product.category,
    isActive: true,
  }).lean();

  // If no VendorProducts match by category, fall back to matching approved vendors directly
  const vendorMap = Object.fromEntries(approvedVendors.map((v) => [String(v._id), v]));

  let vendorOptions;
  if (vendorProducts.length > 0) {
    const vendorIds = [...new Set(vendorProducts.map((vp) => String(vp.vendorId)))];
    vendorOptions = vendorProducts
      .filter((vp) => vendorMap[String(vp.vendorId)])
      .map((vp) => {
        const v = vendorMap[String(vp.vendorId)];
      return {
        vendorId: v._id,
        vendorProductId: vp._id,
        vendorName: v.name,
        unitPrice: vp.unitPrice,
        bulkPrice: vp.unitPrice * 0.9, // 10% bulk estimate
        minOrderQty: vp.minOrderQty,
        leadTimeDays: vp.leadTimeDays,
      };
    });
  } else {
    // Fallback: offer approved vendors even without VendorProduct catalog entries
    vendorOptions = approvedVendors.map((v) => ({
      vendorId: v._id,
      vendorProductId: null,
      vendorName: v.name,
      unitPrice: 0,
      bulkPrice: 0,
      minOrderQty: 1,
      leadTimeDays: v.leadTimeDays || 7,
    }));
  }

  return {
    specHash,
    product: {
      id: product._id,
      name: product.name,
      category: product.category,
      currentStock: product.currentStock,
      minThreshold: product.minThreshold,
      needsReorder: product.currentStock <= product.minThreshold,
    },
    matches: enrichedMatches,
    existingGroups,
    vendorOptions,
  };
}

// ─── Create / Join ────────────────────────────────────────────

/**
 * Create a new cooperative buying group (or join an existing PROPOSED one).
 *
 * @param {Object} opts
 * @param {string} opts.productId
 * @param {string} opts.businessId
 * @param {string} opts.ownerId
 * @param {number} opts.requestedQty
 * @param {string} [opts.cooperativeId]  – if joining an existing group
 * @param {string} [opts.notes]
 * @returns {Object} the cooperative document
 */
async function createOrJoin({ productId, businessId, ownerId, requestedQty, cooperativeId, notes }) {
  const product = await Product.findById(productId).lean();
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });

  const specHash = generateSpecHash({ name: product.name, category: product.category });

  // If joining an existing group
  if (cooperativeId) {
    const coop = await CooperativeBuy.findById(cooperativeId);
    if (!coop) throw Object.assign(new Error('Cooperative group not found'), { status: 404 });
    if (coop.status !== 'PROPOSED') {
      throw Object.assign(new Error('Can only join PROPOSED cooperatives'), { status: 400 });
    }

    // Check not already a participant
    const alreadyIn = coop.participants.some(
      (p) => String(p.businessId) === String(businessId),
    );
    if (alreadyIn) {
      throw Object.assign(new Error('Your business is already in this group'), { status: 409 });
    }

    coop.participants.push({
      businessId,
      ownerId,
      productId,
      requestedQty,
      approved: false,
    });
    coop.totalQuantity = coop.participants.reduce((s, p) => s + p.requestedQty, 0);

    // Recalculate savings estimate based on total quantity
    coop.estimatedSavingsPercent = estimateSavings(coop.totalQuantity);

    await coop.save();

    // Notify existing participants about new joiner
    const business = await Business.findById(businessId).lean();
    for (const p of coop.participants) {
      if (String(p.ownerId) !== String(ownerId)) {
        await createNotification({
          userId: p.ownerId,
          businessId: p.businessId,
          type: 'ORDER_STATUS',
          title: 'New Cooperative Buying Partner',
          message: `${business?.businessName || 'A business'} joined the cooperative group for ${coop.productName}.`,
          referenceId: coop._id,
          referenceType: 'CooperativeBuy',
        });
      }
    }

    return coop.toObject();
  }

  // Create new cooperative group
  // Check for existing PROPOSED group with same specHash to avoid duplicates
  const existing = await CooperativeBuy.findOne({
    productSpecHash: specHash,
    status: 'PROPOSED',
    'participants.businessId': { $ne: businessId },
  });

  if (existing) {
    // Auto-join the existing group instead of creating a new one
    return createOrJoin({
      productId,
      businessId,
      ownerId,
      requestedQty,
      cooperativeId: existing._id,
      notes,
    });
  }

  // Find vendor suggestions — search approved vendors from this business
  const approvedVendors = await Vendor.find({
    businessId,
    status: 'APPROVED',
  }).lean();
  const approvedVendorIds = approvedVendors.map((v) => String(v._id));
  const vendorProducts = await VendorProduct.find({
    vendorId: { $in: approvedVendorIds },
    category: product.category,
    isActive: true,
  }).lean();

  const vendorMap = Object.fromEntries(approvedVendors.map((v) => [String(v._id), v]));

  let vendorSuggestions;
  if (vendorProducts.length > 0) {
    vendorSuggestions = vendorProducts
      .filter((vp) => vendorMap[String(vp.vendorId)])
      .map((vp) => {
        const v = vendorMap[String(vp.vendorId)];
        return {
          vendorId: v._id,
          vendorProductId: vp._id,
          vendorName: v.name,
          unitPrice: vp.unitPrice,
          bulkPrice: vp.unitPrice * 0.9,
          minOrderQty: vp.minOrderQty,
          leadTimeDays: vp.leadTimeDays,
        };
      });
  } else {
    // Fallback: offer approved vendors even without VendorProduct catalog entries
    vendorSuggestions = approvedVendors.map((v) => ({
      vendorId: v._id,
      vendorProductId: null,
      vendorName: v.name,
      unitPrice: 0,
      bulkPrice: 0,
      minOrderQty: 1,
      leadTimeDays: v.leadTimeDays || 7,
    }));
  }

  const coop = await CooperativeBuy.create({
    productSpecHash: specHash,
    productName: product.name,
    category: product.category,
    participants: [
      {
        businessId,
        ownerId,
        productId,
        requestedQty,
        approved: true, // Initiator auto-approves
        approvedAt: new Date(),
      },
    ],
    totalQuantity: requestedQty,
    estimatedSavingsPercent: estimateSavings(requestedQty),
    initiatedBy: ownerId,
    initiatedByBusiness: businessId,
    vendorSuggestions,
    notes: notes || null,
  });

  return coop.toObject();
}

// ─── Approve ──────────────────────────────────────────────────

/**
 * A participant's owner approves their share of the cooperative buy.
 *
 * @param {string} cooperativeId
 * @param {string} businessId  – the approving business
 * @param {string} ownerId     – the approving owner
 * @returns {Object} updated cooperative document
 */
async function approveParticipation(cooperativeId, businessId, ownerId) {
  const coop = await CooperativeBuy.findById(cooperativeId);
  if (!coop) throw Object.assign(new Error('Cooperative group not found'), { status: 404 });
  if (!['PROPOSED'].includes(coop.status)) {
    throw Object.assign(new Error('Cooperative is not in PROPOSED status'), { status: 400 });
  }

  const participant = coop.participants.find(
    (p) => String(p.businessId) === String(businessId),
  );
  if (!participant) {
    throw Object.assign(new Error('Your business is not in this cooperative group'), { status: 403 });
  }

  participant.approved = true;
  participant.approvedAt = new Date();

  // Check if all participants have approved
  const allApproved = coop.participants.every((p) => p.approved);
  if (allApproved && coop.participants.length >= 2) {
    coop.status = 'APPROVED';

    // Notify all participants
    for (const p of coop.participants) {
      await createNotification({
        userId: p.ownerId,
        businessId: p.businessId,
        type: 'ORDER_STATUS',
        title: 'Cooperative Buy Fully Approved',
        message: `All participants approved the cooperative buy for ${coop.productName}. Ready for vendor selection.`,
        referenceId: coop._id,
        referenceType: 'CooperativeBuy',
      });
    }
  }

  await coop.save();
  return coop.toObject();
}

// ─── Select Vendor ────────────────────────────────────────────

/**
 * The initiating owner selects a vendor for the bulk order.
 *
 * @param {string} cooperativeId
 * @param {string} vendorId
 * @param {string} ownerId  – must be the initiator
 * @returns {Object} updated cooperative document
 */
async function selectVendor(cooperativeId, vendorId, ownerId) {
  const coop = await CooperativeBuy.findById(cooperativeId);
  if (!coop) throw Object.assign(new Error('Cooperative group not found'), { status: 404 });

  if (String(coop.initiatedBy) !== String(ownerId)) {
    throw Object.assign(new Error('Only the initiator can select the vendor'), { status: 403 });
  }

  if (coop.status !== 'APPROVED') {
    throw Object.assign(new Error('Cooperative must be APPROVED before selecting a vendor'), { status: 400 });
  }

  // Check vendorSuggestions first, then fall back to checking if vendor is approved in any participant business
  let suggestion = coop.vendorSuggestions.find(
    (s) => String(s.vendorId) === String(vendorId),
  );

  let vendorName = suggestion?.vendorName;

  if (!suggestion) {
    // Maybe suggestions weren't persisted yet — verify vendor is approved in a participant business
    const participantBizIds = coop.participants.map((p) => p.businessId);
    const vendor = await Vendor.findOne({
      _id: vendorId,
      businessId: { $in: participantBizIds },
      status: 'APPROVED',
    }).lean();
    if (!vendor) {
      throw Object.assign(new Error('Vendor not found or not approved for any participant business'), { status: 400 });
    }
    vendorName = vendor.name;
  }

  coop.selectedVendorId = vendorId;
  coop.selectedVendorProductId = suggestion?.vendorProductId || null;
  coop.status = 'ORDERED';
  await coop.save();

  // Notify all participants
  for (const p of coop.participants) {
    await createNotification({
      userId: p.ownerId,
      businessId: p.businessId,
      type: 'ORDER_STATUS',
      title: 'Cooperative Bulk Order Placed',
      message: `A bulk order for ${coop.totalQuantity} units of ${coop.productName} has been placed with ${vendorName || 'selected vendor'}.`,
      referenceId: coop._id,
      referenceType: 'CooperativeBuy',
    });
  }

  return coop.toObject();
}

// ─── List & Get ───────────────────────────────────────────────

/**
 * List cooperative groups relevant to a business.
 */
async function listForBusiness(businessId, { status, page = 1, limit = 20 } = {}) {
  const filter = {
    $or: [
      { 'participants.businessId': businessId },
      { initiatedByBusiness: businessId },
    ],
  };
  if (status) filter.status = status;

  const [groups, total] = await Promise.all([
    CooperativeBuy.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('participants.businessId', 'businessName location')
      .populate('participants.ownerId', 'name email')
      .populate('initiatedBy', 'name email')
      .populate('initiatedByBusiness', 'businessName location')
      .populate('selectedVendorId', 'name email')
      .lean(),
    CooperativeBuy.countDocuments(filter),
  ]);

  return { groups, total, page, limit };
}

/**
 * Get a single cooperative group with full details.
 * Always computes fresh vendor options for PROPOSED/APPROVED groups.
 */
async function getById(cooperativeId) {
  const coop = await CooperativeBuy.findById(cooperativeId)
    .populate('participants.businessId', 'businessName location industry')
    .populate('participants.ownerId', 'name email')
    .populate('participants.productId', 'name sku currentStock minThreshold costPrice')
    .populate('initiatedBy', 'name email')
    .populate('initiatedByBusiness', 'businessName location industry')
    .populate('selectedVendorId', 'name email phone reliabilityScore')
    .lean();

  if (!coop) throw Object.assign(new Error('Cooperative group not found'), { status: 404 });

  // Always compute fresh vendor options for actionable groups
  if (['PROPOSED', 'APPROVED'].includes(coop.status)) {
    const participantBizIds = coop.participants.map((p) =>
      typeof p.businessId === 'object' ? p.businessId._id : p.businessId,
    );

    // Get all approved vendors from all participating businesses
    const approvedVendors = await Vendor.find({
      businessId: { $in: participantBizIds },
      status: 'APPROVED',
    }).lean();

    console.log(`[CooperativeService] getById: found ${approvedVendors.length} approved vendors across ${participantBizIds.length} businesses`);

    const approvedVendorIds = approvedVendors.map((v) => String(v._id));

    // Try matching VendorProducts by category
    const vendorProducts = await VendorProduct.find({
      vendorId: { $in: approvedVendorIds },
      category: { $regex: new RegExp(`^${escapeRegex(coop.category)}$`, 'i') },
      isActive: true,
    }).lean();

    console.log(`[CooperativeService] getById: found ${vendorProducts.length} vendor products for category "${coop.category}"`);

    const vendorMap = Object.fromEntries(approvedVendors.map((v) => [String(v._id), v]));

    let freshSuggestions;
    if (vendorProducts.length > 0) {
      // Deduplicate: one entry per vendor (pick the cheapest VendorProduct)
      const byVendor = {};
      for (const vp of vendorProducts) {
        const vid = String(vp.vendorId);
        if (!byVendor[vid] || vp.unitPrice < byVendor[vid].unitPrice) {
          byVendor[vid] = vp;
        }
      }
      freshSuggestions = Object.values(byVendor)
        .filter((vp) => vendorMap[String(vp.vendorId)])
        .map((vp) => {
          const v = vendorMap[String(vp.vendorId)];
          return {
            vendorId: v._id,
            vendorProductId: vp._id,
            vendorName: v.name,
            unitPrice: vp.unitPrice,
            bulkPrice: vp.unitPrice * 0.9,
            minOrderQty: vp.minOrderQty,
            leadTimeDays: vp.leadTimeDays,
          };
        });
    } else {
      // Fallback: list all approved vendors even without catalog entries
      // Deduplicate by vendor name (same vendor in multiple businesses)
      const seen = new Set();
      freshSuggestions = approvedVendors
        .filter((v) => {
          const key = v.name.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((v) => ({
          vendorId: v._id,
          vendorProductId: null,
          vendorName: v.name,
          unitPrice: 0,
          bulkPrice: 0,
          minOrderQty: 1,
          leadTimeDays: v.leadTimeDays || 7,
        }));
    }

    // Update stored suggestions if they changed
    if (freshSuggestions.length > 0) {
      coop.vendorSuggestions = freshSuggestions;
      // Persist async — don't block response
      CooperativeBuy.findByIdAndUpdate(cooperativeId, {
        vendorSuggestions: freshSuggestions,
      }).catch((err) => console.error('[CooperativeService] failed to persist vendor suggestions:', err.message));
    }
  }

  return coop;
}

/**
 * Discover open cooperative groups for any product in a business
 * (for the discovery/browse page).
 */
async function discoverOpenGroups(businessId, { page = 1, limit = 20 } = {}) {
  // Find all open PROPOSED groups where this business is NOT yet a participant
  const filter = {
    status: 'PROPOSED',
    'participants.businessId': { $ne: businessId },
  };

  const [groups, total] = await Promise.all([
    CooperativeBuy.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('participants.businessId', 'businessName location')
      .populate('initiatedBy', 'name email')
      .populate('initiatedByBusiness', 'businessName location')
      .lean(),
    CooperativeBuy.countDocuments(filter),
  ]);

  return { groups, total, page, limit };
}

// ─── Cancel ───────────────────────────────────────────────────

async function cancelCooperative(cooperativeId, ownerId) {
  const coop = await CooperativeBuy.findById(cooperativeId);
  if (!coop) throw Object.assign(new Error('Cooperative group not found'), { status: 404 });

  if (String(coop.initiatedBy) !== String(ownerId)) {
    throw Object.assign(new Error('Only the initiator can cancel'), { status: 403 });
  }

  if (['DELIVERED', 'CANCELLED'].includes(coop.status)) {
    throw Object.assign(new Error('Cannot cancel a completed or already cancelled cooperative'), { status: 400 });
  }

  coop.status = 'CANCELLED';
  await coop.save();

  // Notify participants
  for (const p of coop.participants) {
    if (String(p.ownerId) !== String(ownerId)) {
      await createNotification({
        userId: p.ownerId,
        businessId: p.businessId,
        type: 'ORDER_STATUS',
        title: 'Cooperative Buy Cancelled',
        message: `The cooperative buying group for ${coop.productName} has been cancelled.`,
        referenceId: coop._id,
        referenceType: 'CooperativeBuy',
      });
    }
  }

  return coop.toObject();
}

// ─── Helpers ──────────────────────────────────────────────────

/** Escape special regex chars in a string */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Estimate bulk savings based on total quantity.
 * Tiered: 5-9% for small pools, 10-15% for medium, 15-25% for large.
 */
function estimateSavings(totalQty) {
  if (totalQty >= 500) return 20;
  if (totalQty >= 200) return 15;
  if (totalQty >= 100) return 12;
  if (totalQty >= 50) return 10;
  if (totalQty >= 20) return 7;
  return 5;
}

module.exports = {
  discoverOpportunities,
  createOrJoin,
  approveParticipation,
  selectVendor,
  listForBusiness,
  getById,
  discoverOpenGroups,
  cancelCooperative,
  estimateSavings,
};
