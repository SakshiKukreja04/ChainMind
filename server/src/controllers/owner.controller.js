/**
 * Owner Controller
 * SME Owner dashboard endpoints: summary, analytics, settings
 */

const { Business, Product, Order, Vendor, User, SalesHistory } = require('../models');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// GET /api/owner/summary
// Dashboard summary stats — all from MongoDB
// ═══════════════════════════════════════════════════════════════
const getOwnerSummary = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const bid = new mongoose.Types.ObjectId(businessId);

    const business = await Business.findById(businessId).select('currency businessName industry location phone').lean();
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const currency = business.currency || 'USD';

    // Run all aggregations in parallel
    const [
      productStats,
      awaitingReceiptCount,
      orderStats,
      vendorStats,
      lowStockProducts,
    ] = await Promise.all([
      // Product stats: total count, total inventory value, stock-at-risk
      Product.aggregate([
        { $match: { businessId: bid, isActive: true } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalInventoryValue: { $sum: { $multiply: ['$costPrice', '$currentStock'] } },
            stockAtRisk: {
              $sum: { $cond: [{ $lt: ['$currentStock', '$minThreshold'] }, 1, 0] },
            },
            outOfStock: {
              $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] },
            },
          },
        },
      ]),

      // Awaiting Receipt = DISPATCHED + IN_TRANSIT
      Order.countDocuments({
        businessId: bid,
        status: { $in: ['DISPATCHED', 'IN_TRANSIT'] },
      }),

      // Order pipeline stats
      Order.aggregate([
        { $match: { businessId: bid } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalValue' },
          },
        },
      ]),

      // Vendor stats
      Vendor.aggregate([
        { $match: { businessId: bid } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
            avgReliability: { $avg: '$reliabilityScore' },
          },
        },
      ]),

      // Low-stock products (top 5)
      Product.find({
        businessId: bid,
        isActive: true,
        $expr: { $lt: ['$currentStock', '$minThreshold'] },
      })
        .sort({ currentStock: 1 })
        .limit(5)
        .select('name sku currentStock minThreshold costPrice')
        .lean(),
    ]);

    // Build order breakdown from aggregation
    const orderBreakdown = {};
    let totalOrders = 0;
    let totalOrderValue = 0;
    for (const s of orderStats) {
      orderBreakdown[s._id] = { count: s.count, value: s.totalValue };
      totalOrders += s.count;
      totalOrderValue += s.totalValue;
    }

    const ps = productStats[0] || { totalProducts: 0, totalInventoryValue: 0, stockAtRisk: 0, outOfStock: 0 };
    const vs = vendorStats[0] || { total: 0, approved: 0, pending: 0, avgReliability: 0 };

    // Fulfillment rate = DELIVERED / (total orders that went past APPROVED)
    const fulfillableStatuses = ['APPROVED', 'CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'VENDOR_REJECTED'];
    const fulfillableCount = fulfillableStatuses.reduce((sum, s) => sum + (orderBreakdown[s]?.count || 0), 0);
    const deliveredCount = orderBreakdown['DELIVERED']?.count || 0;
    const fulfillmentRate = fulfillableCount > 0 ? Math.round((deliveredCount / fulfillableCount) * 100) : 0;

    return res.json({
      success: true,
      currency,
      businessName: business.businessName,
      industry: business.industry || '',
      location: business.location || '',
      phone: business.phone || '',
      summary: {
        totalProducts: ps.totalProducts,
        totalInventoryValue: ps.totalInventoryValue,
        stockAtRisk: ps.stockAtRisk,
        outOfStock: ps.outOfStock,
        awaitingReceipt: awaitingReceiptCount,
        totalOrders,
        totalOrderValue,
        pendingApprovals: (orderBreakdown['PENDING_APPROVAL']?.count || 0) + vs.pending,
        fulfillmentRate,
        vendors: {
          total: vs.total,
          approved: vs.approved,
          pending: vs.pending,
          avgReliability: Math.round(vs.avgReliability || 0),
        },
        orderBreakdown,
        lowStockProducts: lowStockProducts.map(p => ({
          id: p._id,
          name: p.name,
          sku: p.sku,
          currentStock: p.currentStock,
          minThreshold: p.minThreshold,
          restockValue: (p.minThreshold - p.currentStock) * p.costPrice,
        })),
      },
    });
  } catch (err) {
    console.error('getOwnerSummary error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/owner/analytics
// Read-only analytics — MongoDB aggregation pipelines
// ═══════════════════════════════════════════════════════════════
const getOwnerAnalytics = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const bid = new mongoose.Types.ObjectId(businessId);

    const business = await Business.findById(businessId).select('currency').lean();
    const currency = business?.currency || 'USD';

    // Default to last 12 months
    const months = parseInt(req.query.months) || 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const [monthlySales, inventoryValuation, vendorReliability, fulfillmentTrend] = await Promise.all([
      // 1. Monthly sales — DELIVERED orders grouped by month
      // Use deliveredAt, falling back to actualDeliveryDate, then updatedAt
      Order.aggregate([
        {
          $match: {
            businessId: bid,
            status: 'DELIVERED',
          },
        },
        {
          $addFields: {
            _resolvedDeliveredAt: {
              $ifNull: ['$deliveredAt', { $ifNull: ['$actualDeliveryDate', '$updatedAt'] }],
            },
          },
        },
        {
          $match: {
            _resolvedDeliveredAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$_resolvedDeliveredAt' },
              month: { $month: '$_resolvedDeliveredAt' },
            },
            totalRevenue: { $sum: '$totalValue' },
            orderCount: { $sum: 1 },
            totalUnits: { $sum: '$quantity' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            totalRevenue: 1,
            orderCount: 1,
            totalUnits: 1,
          },
        },
      ]),

      // 2. Inventory valuation — current snapshot by category
      Product.aggregate([
        { $match: { businessId: bid, isActive: true } },
        {
          $group: {
            _id: '$category',
            totalCostValue: { $sum: { $multiply: ['$costPrice', '$currentStock'] } },
            totalSellingValue: { $sum: { $multiply: ['$sellingPrice', '$currentStock'] } },
            productCount: { $sum: 1 },
            totalUnits: { $sum: '$currentStock' },
          },
        },
        { $sort: { totalCostValue: -1 } },
        {
          $project: {
            _id: 0,
            category: '$_id',
            totalCostValue: 1,
            totalSellingValue: 1,
            productCount: 1,
            totalUnits: 1,
            potentialMargin: { $subtract: ['$totalSellingValue', '$totalCostValue'] },
          },
        },
      ]),

      // 3. Vendor reliability trend — per vendor
      Vendor.aggregate([
        { $match: { businessId: bid, isActive: true } },
        { $sort: { reliabilityScore: -1 } },
        {
          $project: {
            _id: 0,
            id: '$_id',
            name: 1,
            reliabilityScore: 1,
            totalOrders: 1,
            leadTimeDays: 1,
            rating: 1,
            onTimeDeliveryRate: '$performanceMetrics.onTimeDeliveryRate',
          },
        },
      ]),

      // 4. Fulfillment rate trend — monthly
      Order.aggregate([
        {
          $match: {
            businessId: bid,
            status: { $in: ['DELIVERED', 'VENDOR_REJECTED'] },
            updatedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$updatedAt' },
              month: { $month: '$updatedAt' },
            },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] },
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', 'VENDOR_REJECTED'] }, 1, 0] },
            },
            total: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            delivered: 1,
            rejected: 1,
            total: 1,
            fulfillmentRate: {
              $round: [{ $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 1],
            },
          },
        },
      ]),
    ]);

    // Fill missing months for monthly sales with zeros
    const filledMonthlySales = fillMissingMonths(monthlySales, months);

    return res.json({
      success: true,
      currency,
      analytics: {
        monthlySales: filledMonthlySales,
        inventoryValuation,
        vendorReliability,
        fulfillmentTrend,
        totals: {
          totalSalesRevenue: monthlySales.reduce((sum, m) => sum + m.totalRevenue, 0),
          totalSalesOrders: monthlySales.reduce((sum, m) => sum + m.orderCount, 0),
          totalInventoryCostValue: inventoryValuation.reduce((sum, c) => sum + c.totalCostValue, 0),
          totalInventorySellingValue: inventoryValuation.reduce((sum, c) => sum + c.totalSellingValue, 0),
          avgVendorReliability: vendorReliability.length > 0
            ? Math.round(vendorReliability.reduce((sum, v) => sum + v.reliabilityScore, 0) / vendorReliability.length)
            : 0,
        },
      },
    });
  } catch (err) {
    console.error('getOwnerAnalytics error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Fill missing months in monthly data with zeros.
 */
function fillMissingMonths(data, monthsBack) {
  const now = new Date();
  const result = [];
  const dataMap = {};
  for (const d of data) {
    dataMap[`${d.year}-${d.month}`] = d;
  }
  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month}`;
    result.push(
      dataMap[key] || { year, month, totalRevenue: 0, orderCount: 0, totalUnits: 0 },
    );
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// PUT /api/owner/settings
// Update User + Business settings
// ═══════════════════════════════════════════════════════════════
const updateOwnerSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const businessId = req.user.businessId;

    const {
      // User fields
      name,
      // Business fields
      businessName,
      industry,
      location,
      currency,
      phone,
    } = req.body;

    // Update User
    const userUpdates = {};
    if (name) userUpdates.name = name.trim();

    let updatedUser = null;
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await User.findByIdAndUpdate(userId, userUpdates, { new: true })
        .select('name email role businessId')
        .lean();
    } else {
      updatedUser = await User.findById(userId).select('name email role businessId').lean();
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update Business
    const businessUpdates = {};
    if (businessName) businessUpdates.businessName = businessName.trim();
    if (industry) businessUpdates.industry = industry.trim();
    if (location) businessUpdates.location = location.trim();
    if (currency) businessUpdates.currency = currency.toUpperCase().trim();
    if (phone) businessUpdates.phone = phone.trim();

    let updatedBusiness = null;
    if (Object.keys(businessUpdates).length > 0) {
      updatedBusiness = await Business.findByIdAndUpdate(businessId, businessUpdates, { new: true })
        .select('businessName industry location currency phone')
        .lean();
    } else {
      updatedBusiness = await Business.findById(businessId)
        .select('businessName industry location currency phone')
        .lean();
    }

    if (!updatedBusiness) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    return res.json({
      success: true,
      message: 'Settings updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        businessId: updatedUser.businessId,
      },
      business: {
        id: updatedBusiness._id,
        businessName: updatedBusiness.businessName,
        industry: updatedBusiness.industry,
        location: updatedBusiness.location,
        currency: updatedBusiness.currency,
        phone: updatedBusiness.phone,
      },
    });
  } catch (err) {
    console.error('updateOwnerSettings error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getOwnerSummary,
  getOwnerAnalytics,
  updateOwnerSettings,
};
