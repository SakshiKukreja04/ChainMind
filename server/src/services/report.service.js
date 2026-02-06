/**
 * Report Service
 * Generates reports using MongoDB aggregation pipelines.
 * All data is live from the database — no hardcoded values.
 *
 * Report types:
 *   MONTHLY_SALES       — Delivered order revenue by month
 *   INVENTORY_STATUS    — Current stock, consumption, AI thresholds, valuation
 *   VENDOR_PERFORMANCE  — Fulfillment, delivery times, reliability
 *   FINANCIAL_SUMMARY   — P&L style overview from orders + inventory
 */

const mongoose = require('mongoose');
const { Business, Product, Order, Vendor, SalesHistory } = require('../models');
const ReportSnapshot = require('../models/ReportSnapshot.model');

/** Default cache TTL: 1 hour */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────

function defaultDateRange(months = 12) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

const monthName = (m) => [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
][m - 1] || `M${m}`;

// ─── Cache Layer ──────────────────────────────────────────────

async function getCachedSnapshot(businessId, reportType) {
  try {
    return await ReportSnapshot.findOne({
      businessId,
      reportType,
      expiresAt: { $gt: new Date() },
    })
      .sort({ generatedAt: -1 })
      .lean();
  } catch {
    return null;
  }
}

async function cacheSnapshot(businessId, reportType, data, metadata = {}, ttlMs = DEFAULT_TTL_MS) {
  try {
    const now = new Date();
    return await ReportSnapshot.create({
      businessId,
      reportType,
      generatedAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      format: 'JSON',
      data,
      metadata,
    });
  } catch (err) {
    console.warn('[ReportService] cache write failed:', err.message);
    return null;
  }
}

// ─── 1. Monthly Sales Report ──────────────────────────────────

async function generateMonthlySales(businessId, options = {}) {
  const bid = new mongoose.Types.ObjectId(businessId);
  const business = await Business.findById(businessId).select('currency businessName').lean();
  const currency = business?.currency || 'USD';
  const months = options.months || 12;
  const { start } = defaultDateRange(months);

  const [monthlySales, topProducts] = await Promise.all([
    Order.aggregate([
      { $match: { businessId: bid, status: 'DELIVERED', deliveredAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: '$deliveredAt' }, month: { $month: '$deliveredAt' } },
          revenue: { $sum: '$totalValue' },
          orders: { $sum: 1 },
          units: { $sum: '$quantity' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    // Top 10 products by revenue
    Order.aggregate([
      { $match: { businessId: bid, status: 'DELIVERED', deliveredAt: { $gte: start } } },
      {
        $group: {
          _id: '$productId',
          revenue: { $sum: '$totalValue' },
          orders: { $sum: 1 },
          units: { $sum: '$quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: '$product.name',
          sku: '$product.sku',
          category: '$product.category',
          revenue: 1,
          orders: 1,
          units: 1,
        },
      },
    ]),
  ]);

  const totalRevenue = monthlySales.reduce((s, m) => s + m.revenue, 0);
  const totalOrders = monthlySales.reduce((s, m) => s + m.orders, 0);

  const report = {
    reportType: 'MONTHLY_SALES',
    businessName: business?.businessName,
    currency,
    period: { months, startDate: start.toISOString() },
    generatedAt: new Date().toISOString(),
    summary: { totalRevenue, totalOrders, avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0 },
    monthlySales: monthlySales.map(m => ({
      year: m._id.year,
      month: m._id.month,
      monthName: `${monthName(m._id.month)} ${m._id.year}`,
      revenue: m.revenue,
      orders: m.orders,
      units: m.units,
    })),
    topProducts,
  };

  return report;
}

// ─── 2. Inventory Status Report ───────────────────────────────

async function generateInventoryStatus(businessId) {
  const bid = new mongoose.Types.ObjectId(businessId);
  const business = await Business.findById(businessId).select('currency businessName').lean();
  const currency = business?.currency || 'USD';

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d14 = new Date(now.getTime() - 14 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  // Get all active products
  const products = await Product.find({ businessId: bid, isActive: true })
    .populate('vendorId', 'name')
    .lean();

  // Get consumption data from SalesHistory
  const consumptionAgg = await SalesHistory.aggregate([
    { $match: { businessId: bid, date: { $gte: d30 } } },
    {
      $group: {
        _id: '$productId',
        total30: { $sum: '$quantitySold' },
        entries30: { $sum: 1 },
      },
    },
  ]);
  const consumptionMap = {};
  for (const c of consumptionAgg) {
    consumptionMap[c._id.toString()] = c;
  }

  // 7-day and 14-day consumption
  const consumption7 = await SalesHistory.aggregate([
    { $match: { businessId: bid, date: { $gte: d7 } } },
    { $group: { _id: '$productId', total: { $sum: '$quantitySold' } } },
  ]);
  const c7Map = {};
  for (const c of consumption7) c7Map[c._id.toString()] = c.total;

  const consumption14 = await SalesHistory.aggregate([
    { $match: { businessId: bid, date: { $gte: d14 } } },
    { $group: { _id: '$productId', total: { $sum: '$quantitySold' } } },
  ]);
  const c14Map = {};
  for (const c of consumption14) c14Map[c._id.toString()] = c.total;

  // Delivered orders last 30d (alternate consumption measure)
  const deliveredConsumption = await Order.aggregate([
    { $match: { businessId: bid, status: 'DELIVERED', deliveredAt: { $gte: d30 } } },
    { $group: { _id: '$productId', totalDelivered: { $sum: '$quantity' } } },
  ]);
  const deliveredMap = {};
  for (const d of deliveredConsumption) deliveredMap[d._id.toString()] = d.totalDelivered;

  let totalCostValue = 0;
  let totalSellingValue = 0;
  let lowStockCount = 0;
  let criticalCount = 0;
  let outOfStockCount = 0;

  const items = products.map(p => {
    const pid = p._id.toString();
    const c30 = consumptionMap[pid]?.total30 || 0;
    const avg7 = Math.round((c7Map[pid] || 0) / 7 * 100) / 100;
    const avg14 = Math.round((c14Map[pid] || 0) / 14 * 100) / 100;
    const avg30 = Math.round(c30 / 30 * 100) / 100;

    const costValue = p.costPrice * p.currentStock;
    const sellingValue = p.sellingPrice * p.currentStock;
    totalCostValue += costValue;
    totalSellingValue += sellingValue;

    const isOutOfStock = p.currentStock === 0;
    const isCritical = !isOutOfStock && p.currentStock < p.minThreshold * 0.5;
    const isLowStock = !isOutOfStock && !isCritical && p.currentStock < p.minThreshold;

    if (isOutOfStock) outOfStockCount++;
    else if (isCritical) criticalCount++;
    else if (isLowStock) lowStockCount++;

    return {
      productId: p._id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      vendorName: p.vendorId?.name || 'Unassigned',
      currentStock: p.currentStock,
      minThreshold: p.minThreshold,
      avgConsumption7d: avg7,
      avgConsumption14d: avg14,
      avgConsumption30d: avg30,
      aiReorderThreshold: p.minThreshold,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      costValue,
      sellingValue,
      isOutOfStock,
      isCritical,
      isLowStock,
      daysOfStockRemaining: avg30 > 0 ? Math.round(p.currentStock / avg30) : null,
    };
  });

  const report = {
    reportType: 'INVENTORY_STATUS',
    businessName: business?.businessName,
    currency,
    generatedAt: new Date().toISOString(),
    summary: {
      totalProducts: products.length,
      totalCostValue,
      totalSellingValue,
      potentialMargin: totalSellingValue - totalCostValue,
      outOfStock: outOfStockCount,
      critical: criticalCount,
      lowStock: lowStockCount,
      healthy: products.length - outOfStockCount - criticalCount - lowStockCount,
    },
    items,
  };

  return report;
}

// ─── 3. Vendor Performance Report ─────────────────────────────

async function generateVendorPerformance(businessId) {
  const bid = new mongoose.Types.ObjectId(businessId);
  const business = await Business.findById(businessId).select('currency businessName').lean();
  const currency = business?.currency || 'USD';

  const vendors = await Vendor.find({ businessId: bid, isActive: true }).lean();

  // Get order stats per vendor
  const vendorOrderStats = await Order.aggregate([
    { $match: { businessId: bid } },
    {
      $group: {
        _id: { vendorId: '$vendorId', status: '$status' },
        count: { $sum: 1 },
        totalValue: { $sum: '$totalValue' },
      },
    },
  ]);

  // Build lookup
  const statsMap = {};
  for (const s of vendorOrderStats) {
    const vid = s._id.vendorId?.toString();
    if (!vid) continue;
    if (!statsMap[vid]) statsMap[vid] = {};
    statsMap[vid][s._id.status] = { count: s.count, value: s.totalValue };
  }

  // Avg delivery time per vendor (DELIVERED orders that have expectedDeliveryDate)
  const deliveryTimes = await Order.aggregate([
    {
      $match: {
        businessId: bid,
        status: 'DELIVERED',
        deliveredAt: { $ne: null },
        createdAt: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$vendorId',
        avgDeliveryMs: {
          $avg: { $subtract: ['$deliveredAt', '$createdAt'] },
        },
        onTimeCount: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$expectedDeliveryDate', null] },
                  { $lte: ['$deliveredAt', '$expectedDeliveryDate'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalDelivered: { $sum: 1 },
        delayedCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$expectedDeliveryDate', null] },
                  { $gt: ['$deliveredAt', '$expectedDeliveryDate'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  const deliveryMap = {};
  for (const d of deliveryTimes) {
    if (d._id) deliveryMap[d._id.toString()] = d;
  }

  const vendorReports = vendors.map(v => {
    const vid = v._id.toString();
    const stats = statsMap[vid] || {};
    const delivery = deliveryMap[vid] || {};

    const totalFulfilled = stats['DELIVERED']?.count || 0;
    const totalRejected = stats['VENDOR_REJECTED']?.count || 0;
    const totalOrders = Object.values(stats).reduce((s, st) => s + st.count, 0);
    const avgDeliveryDays = delivery.avgDeliveryMs ? Math.round(delivery.avgDeliveryMs / 86400000 * 10) / 10 : null;
    const onTimeRate = delivery.totalDelivered > 0
      ? Math.round((delivery.onTimeCount / delivery.totalDelivered) * 100)
      : null;
    const delayRate = delivery.totalDelivered > 0
      ? Math.round((delivery.delayedCount / delivery.totalDelivered) * 100)
      : 0;
    const rejectionRate = totalOrders > 0 ? Math.round((totalRejected / totalOrders) * 100) : 0;

    return {
      vendorId: v._id,
      name: v.name,
      email: v.email,
      contact: v.contact,
      reliabilityScore: v.reliabilityScore,
      rating: v.rating,
      leadTimeDays: v.leadTimeDays,
      totalOrders,
      totalFulfilled,
      totalRejected,
      avgDeliveryDays,
      onTimeDeliveryRate: onTimeRate,
      delayRate,
      rejectionRate,
      totalOrderValue: Object.values(stats).reduce((s, st) => s + st.value, 0),
    };
  });

  // Sort by reliability desc
  vendorReports.sort((a, b) => b.reliabilityScore - a.reliabilityScore);

  const report = {
    reportType: 'VENDOR_PERFORMANCE',
    businessName: business?.businessName,
    currency,
    generatedAt: new Date().toISOString(),
    summary: {
      totalVendors: vendors.length,
      avgReliability: vendors.length > 0
        ? Math.round(vendors.reduce((s, v) => s + v.reliabilityScore, 0) / vendors.length)
        : 0,
      topVendor: vendorReports[0]?.name || 'N/A',
    },
    vendors: vendorReports,
  };

  return report;
}

// ─── 4. Financial Summary ─────────────────────────────────────

async function generateFinancialSummary(businessId, options = {}) {
  const bid = new mongoose.Types.ObjectId(businessId);
  const business = await Business.findById(businessId).select('currency businessName').lean();
  const currency = business?.currency || 'USD';
  const months = options.months || 12;
  const { start } = defaultDateRange(months);

  const [revenueByMonth, inventoryValue, pendingOrderValue, topExpenses] = await Promise.all([
    // Monthly revenue from DELIVERED orders
    Order.aggregate([
      { $match: { businessId: bid, status: 'DELIVERED', deliveredAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: '$deliveredAt' }, month: { $month: '$deliveredAt' } },
          revenue: { $sum: '$totalValue' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    // Current inventory value
    Product.aggregate([
      { $match: { businessId: bid, isActive: true } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: { $multiply: ['$costPrice', '$currentStock'] } },
          totalSelling: { $sum: { $multiply: ['$sellingPrice', '$currentStock'] } },
          totalUnits: { $sum: '$currentStock' },
        },
      },
    ]),

    // Pending/in-progress order value
    Order.aggregate([
      {
        $match: {
          businessId: bid,
          status: { $in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'DISPATCHED', 'IN_TRANSIT'] },
        },
      },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$totalValue' },
          count: { $sum: 1 },
        },
      },
    ]),

    // Top expense categories (from delivered orders joined to products)
    Order.aggregate([
      { $match: { businessId: bid, status: 'DELIVERED', deliveredAt: { $gte: start } } },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$product.category',
          totalSpent: { $sum: '$totalValue' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const totalRevenue = revenueByMonth.reduce((s, m) => s + m.revenue, 0);
  const inv = inventoryValue[0] || { totalCost: 0, totalSelling: 0, totalUnits: 0 };
  const pendingValue = pendingOrderValue.reduce((s, p) => s + p.total, 0);
  const pendingCount = pendingOrderValue.reduce((s, p) => s + p.count, 0);

  const report = {
    reportType: 'FINANCIAL_SUMMARY',
    businessName: business?.businessName,
    currency,
    period: { months, startDate: start.toISOString() },
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue,
      inventoryCostValue: inv.totalCost,
      inventorySellingValue: inv.totalSelling,
      potentialMargin: inv.totalSelling - inv.totalCost,
      cashTiedInInventory: inv.totalCost,
      pendingOrderValue: pendingValue,
      pendingOrderCount: pendingCount,
    },
    revenueByMonth: revenueByMonth.map(m => ({
      year: m._id.year,
      month: m._id.month,
      monthName: `${monthName(m._id.month)} ${m._id.year}`,
      revenue: m.revenue,
      orders: m.orders,
    })),
    topExpenseCategories: topExpenses.map(e => ({
      category: e._id || 'Uncategorized',
      totalSpent: e.totalSpent,
      orders: e.orders,
    })),
    pendingOrdersByStatus: pendingOrderValue.map(p => ({
      status: p._id,
      value: p.total,
      count: p.count,
    })),
  };

  return report;
}

// ─── Public API ───────────────────────────────────────────────

const GENERATORS = {
  MONTHLY_SALES: generateMonthlySales,
  INVENTORY_STATUS: generateInventoryStatus,
  VENDOR_PERFORMANCE: generateVendorPerformance,
  FINANCIAL_SUMMARY: generateFinancialSummary,
};

/**
 * Generate a report (with optional caching).
 * @param {string} reportType  MONTHLY_SALES | INVENTORY_STATUS | VENDOR_PERFORMANCE | FINANCIAL_SUMMARY
 * @param {string} businessId  Mongoose ObjectId
 * @param {object} options     { months, skipCache }
 */
async function generateReport(reportType, businessId, options = {}) {
  const generator = GENERATORS[reportType];
  if (!generator) throw new Error(`Unknown report type: ${reportType}`);

  // Check cache first (unless explicitly skipped)
  if (!options.skipCache) {
    const cached = await getCachedSnapshot(businessId, reportType);
    if (cached?.data) {
      return { ...cached.data, _cached: true, _cachedAt: cached.generatedAt };
    }
  }

  // Generate fresh
  const data = await generator(businessId, options);

  // Cache it
  await cacheSnapshot(businessId, reportType, data, { options });

  return data;
}

module.exports = {
  generateReport,
  generateMonthlySales,
  generateInventoryStatus,
  generateVendorPerformance,
  generateFinancialSummary,
  getCachedSnapshot,
  cacheSnapshot,
  GENERATORS,
};
