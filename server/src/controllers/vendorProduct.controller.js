/**
 * VendorProduct Controller
 * CRUD for vendor product catalog
 *
 * POST   /api/vendor/products          – Create catalog item   (VENDOR)
 * GET    /api/vendor/products          – List catalog items     (VENDOR | OWNER | MANAGER)
 * PUT    /api/vendor/products/:id      – Update catalog item    (VENDOR)
 * PATCH  /api/vendor/products/:id/status – Toggle active/inactive (VENDOR)
 */

const VendorProduct = require('../models/VendorProduct.model');
const { Vendor } = require('../models');
const User = require('../models/User.model');

/**
 * Resolve the Vendor entity for the current JWT user.
 * Mirrors the helper in order.controller.js.
 */
async function resolveVendor(reqUser) {
  if (reqUser.vendorEntityId) {
    const v = await Vendor.findById(reqUser.vendorEntityId);
    if (v) return v;
  }
  const fullUser = await User.findById(reqUser.userId || reqUser._id);
  if (fullUser?.vendorEntityId) {
    const v = await Vendor.findById(fullUser.vendorEntityId);
    if (v) return v;
  }
  return null;
}

// ── POST /api/vendor/products ───────────────────────────────────
const createVendorProduct = async (req, res) => {
  try {
    const vendor = await resolveVendor(req.user);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor record not found for your account' });
    }

    const { name, sku, category, unitPrice, minOrderQty, leadTimeDays } = req.body;

    if (!name || !sku || unitPrice == null) {
      return res.status(400).json({
        success: false,
        message: '"name", "sku", and "unitPrice" are required',
      });
    }

    const product = await VendorProduct.create({
      vendorId: vendor._id,
      businessId: vendor.businessId,
      name: name.trim(),
      sku: sku.trim(),
      category: category?.trim() || 'General',
      unitPrice: Number(unitPrice),
      minOrderQty: Number(minOrderQty) || 1,
      leadTimeDays: leadTimeDays != null ? Number(leadTimeDays) : vendor.leadTimeDays || 7,
      isActive: true,
    });

    console.log(`✓ VendorProduct created: ${product.name} (${product.sku}) by vendor ${vendor.name}`);

    return res.status(201).json({
      success: true,
      message: 'Product added to catalog',
      product: formatProduct(product, vendor),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `SKU "${req.body.sku}" already exists in your catalog`,
      });
    }
    console.error('createVendorProduct error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/vendor/products ────────────────────────────────────
// VENDOR → sees own catalog
// OWNER / MANAGER → can optionally filter by ?vendorId=xxx, or see all for business
const listVendorProducts = async (req, res) => {
  try {
    const { role, businessId } = req.user;
    const { vendorId, active } = req.query;
    let filter = {};

    if (role === 'VENDOR') {
      const vendor = await resolveVendor(req.user);
      if (!vendor) return res.json({ success: true, count: 0, products: [] });
      filter.vendorId = vendor._id;
    } else {
      // OWNER or MANAGER — filter by business
      filter.businessId = businessId;
      if (vendorId) filter.vendorId = vendorId;
    }

    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const products = await VendorProduct.find(filter)
      .populate('vendorId', 'name contact email')
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: products.length,
      products: products.map((p) => ({
        id: p._id,
        vendorId: p.vendorId?._id || p.vendorId,
        vendorName: p.vendorId?.name || 'Unknown',
        name: p.name,
        sku: p.sku,
        category: p.category,
        unitPrice: p.unitPrice,
        minOrderQty: p.minOrderQty,
        leadTimeDays: p.leadTimeDays,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    console.error('listVendorProducts error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── PUT /api/vendor/products/:id ────────────────────────────────
const updateVendorProduct = async (req, res) => {
  try {
    const vendor = await resolveVendor(req.user);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor record not found' });
    }

    const product = await VendorProduct.findOne({
      _id: req.params.id,
      vendorId: vendor._id,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Catalog product not found' });
    }

    const { name, sku, category, unitPrice, minOrderQty, leadTimeDays } = req.body;
    if (name != null) product.name = name.trim();
    if (sku != null) product.sku = sku.trim();
    if (category != null) product.category = category.trim();
    if (unitPrice != null) product.unitPrice = Number(unitPrice);
    if (minOrderQty != null) product.minOrderQty = Number(minOrderQty);
    if (leadTimeDays != null) product.leadTimeDays = Number(leadTimeDays);

    await product.save();

    console.log(`✓ VendorProduct updated: ${product.name} (${product.sku})`);

    return res.json({
      success: true,
      message: 'Product updated',
      product: formatProduct(product, vendor),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate SKU' });
    }
    console.error('updateVendorProduct error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── PATCH /api/vendor/products/:id/status ───────────────────────
const toggleVendorProductStatus = async (req, res) => {
  try {
    const vendor = await resolveVendor(req.user);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor record not found' });
    }

    const product = await VendorProduct.findOne({
      _id: req.params.id,
      vendorId: vendor._id,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Catalog product not found' });
    }

    // If body has explicit isActive, use it; otherwise toggle
    product.isActive = req.body.isActive != null ? !!req.body.isActive : !product.isActive;
    await product.save();

    console.log(`✓ VendorProduct ${product.isActive ? 'activated' : 'deactivated'}: ${product.sku}`);

    return res.json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'}`,
      product: formatProduct(product, vendor),
    });
  } catch (err) {
    console.error('toggleVendorProductStatus error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Helper ──────────────────────────────────────────────────────
function formatProduct(p, vendor) {
  return {
    id: p._id,
    vendorId: vendor?._id || p.vendorId,
    vendorName: vendor?.name || 'Unknown',
    name: p.name,
    sku: p.sku,
    category: p.category,
    unitPrice: p.unitPrice,
    minOrderQty: p.minOrderQty,
    leadTimeDays: p.leadTimeDays,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

module.exports = {
  createVendorProduct,
  listVendorProducts,
  updateVendorProduct,
  toggleVendorProductStatus,
};
