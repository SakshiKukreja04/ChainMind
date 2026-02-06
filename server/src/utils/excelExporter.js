/**
 * Excel Exporter Utility
 * Generates .xlsx buffers from report data using ExcelJS.
 * Respects Business.currency for all financial columns.
 */

let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch {
  ExcelJS = null;
}

function ensureExcelJS() {
  if (!ExcelJS) {
    throw new Error('exceljs is not installed. Run: npm install exceljs');
  }
}

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'C$', AUD: 'A$',
};

function currSym(currency) {
  return CURRENCY_SYMBOLS[currency] || currency + ' ';
}

function fmtCurrency(value, currency) {
  return `${currSym(currency)}${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Monthly Sales ────────────────────────────────────────────

async function exportMonthlySales(report) {
  ensureExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ChainMind';
  wb.created = new Date();

  const ws = wb.addWorksheet('Monthly Sales');
  const c = report.currency;

  // Header
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = `Monthly Sales Report — ${report.businessName}`;
  ws.getCell('A1').font = { bold: true, size: 16 };
  ws.getCell('A2').value = `Generated: ${new Date(report.generatedAt).toLocaleString()} | Currency: ${c}`;
  ws.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF666666' } };

  // Summary
  ws.getCell('A4').value = 'Summary';
  ws.getCell('A4').font = { bold: true, size: 12 };
  ws.getCell('A5').value = 'Total Revenue';
  ws.getCell('B5').value = fmtCurrency(report.summary.totalRevenue, c);
  ws.getCell('A6').value = 'Total Orders';
  ws.getCell('B6').value = report.summary.totalOrders;
  ws.getCell('A7').value = 'Avg Order Value';
  ws.getCell('B7').value = fmtCurrency(report.summary.avgOrderValue, c);

  // Monthly data table
  ws.getCell('A9').value = 'Monthly Breakdown';
  ws.getCell('A9').font = { bold: true, size: 12 };

  const headerRow = ws.addRow(['Month', 'Revenue', 'Orders', 'Units Sold']);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3B5C' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  for (const m of report.monthlySales || []) {
    ws.addRow([m.monthName, fmtCurrency(m.revenue, c), m.orders, m.units]);
  }

  // Top Products
  ws.addRow([]);
  const tpHeader = ws.addRow(['Top Products', '', '', '', '', '']);
  tpHeader.getCell(1).font = { bold: true, size: 12 };
  const tpCols = ws.addRow(['Product', 'SKU', 'Category', 'Revenue', 'Orders', 'Units']);
  tpCols.font = { bold: true };
  tpCols.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3B5C' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  for (const p of report.topProducts || []) {
    ws.addRow([p.productName, p.sku, p.category, fmtCurrency(p.revenue, c), p.orders, p.units]);
  }

  // Auto-width
  ws.columns.forEach(col => { col.width = 18; });

  return wb.xlsx.writeBuffer();
}

// ─── Inventory Status ─────────────────────────────────────────

async function exportInventoryStatus(report) {
  ensureExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Inventory Status');
  const c = report.currency;

  ws.mergeCells('A1:K1');
  ws.getCell('A1').value = `Inventory Status Report — ${report.businessName}`;
  ws.getCell('A1').font = { bold: true, size: 16 };
  ws.getCell('A2').value = `Generated: ${new Date(report.generatedAt).toLocaleString()} | Currency: ${c}`;
  ws.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF666666' } };

  // Summary
  ws.getCell('A4').value = `Total Products: ${report.summary.totalProducts}`;
  ws.getCell('C4').value = `Value (Cost): ${fmtCurrency(report.summary.totalCostValue, c)}`;
  ws.getCell('F4').value = `Low Stock: ${report.summary.lowStock} | Critical: ${report.summary.critical} | Out: ${report.summary.outOfStock}`;

  ws.addRow([]);

  const cols = ['Product', 'SKU', 'Category', 'Stock', 'Min Threshold', 'Avg 7d', 'Avg 14d', 'Avg 30d', 'Days Left', `Cost Value (${c})`, 'Status'];
  const headerRow = ws.addRow(cols);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3B5C' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  for (const item of report.items || []) {
    const status = item.isOutOfStock ? 'OUT OF STOCK' : item.isCritical ? 'CRITICAL' : item.isLowStock ? 'LOW' : 'OK';
    const row = ws.addRow([
      item.name, item.sku, item.category, item.currentStock, item.minThreshold,
      item.avgConsumption7d, item.avgConsumption14d, item.avgConsumption30d,
      item.daysOfStockRemaining ?? 'N/A', fmtCurrency(item.costValue, c), status,
    ]);

    if (item.isOutOfStock || item.isCritical) {
      row.eachCell(cell => { cell.font = { color: { argb: 'FFCC0000' } }; });
    } else if (item.isLowStock) {
      row.eachCell(cell => { cell.font = { color: { argb: 'FFDD8800' } }; });
    }
  }

  ws.columns.forEach(col => { col.width = 16; });
  return wb.xlsx.writeBuffer();
}

// ─── Vendor Performance ───────────────────────────────────────

async function exportVendorPerformance(report) {
  ensureExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Vendor Performance');
  const c = report.currency;

  ws.mergeCells('A1:J1');
  ws.getCell('A1').value = `Vendor Performance Report — ${report.businessName}`;
  ws.getCell('A1').font = { bold: true, size: 16 };
  ws.getCell('A2').value = `Generated: ${new Date(report.generatedAt).toLocaleString()} | Currency: ${c}`;

  ws.addRow([]);

  const cols = ['Vendor', 'Reliability', 'Rating', 'Total Orders', 'Fulfilled', 'Rejected',
    'Avg Delivery (days)', 'On-Time %', 'Delay %', `Order Value (${c})`];
  const headerRow = ws.addRow(cols);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3B5C' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  for (const v of report.vendors || []) {
    ws.addRow([
      v.name, v.reliabilityScore, v.rating, v.totalOrders, v.totalFulfilled, v.totalRejected,
      v.avgDeliveryDays ?? 'N/A', v.onTimeDeliveryRate != null ? `${v.onTimeDeliveryRate}%` : 'N/A',
      `${v.delayRate}%`, fmtCurrency(v.totalOrderValue, c),
    ]);
  }

  ws.columns.forEach(col => { col.width = 18; });
  return wb.xlsx.writeBuffer();
}

// ─── Financial Summary ────────────────────────────────────────

async function exportFinancialSummary(report) {
  ensureExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Financial Summary');
  const c = report.currency;

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = `Financial Summary — ${report.businessName}`;
  ws.getCell('A1').font = { bold: true, size: 16 };
  ws.getCell('A2').value = `Generated: ${new Date(report.generatedAt).toLocaleString()} | Currency: ${c}`;

  ws.addRow([]);
  ws.getCell('A4').value = 'Key Metrics';
  ws.getCell('A4').font = { bold: true, size: 12 };

  const metrics = [
    ['Total Revenue', fmtCurrency(report.summary.totalRevenue, c)],
    ['Inventory Cost Value', fmtCurrency(report.summary.inventoryCostValue, c)],
    ['Inventory Selling Value', fmtCurrency(report.summary.inventorySellingValue, c)],
    ['Potential Margin', fmtCurrency(report.summary.potentialMargin, c)],
    ['Cash Tied in Inventory', fmtCurrency(report.summary.cashTiedInInventory, c)],
    ['Pending Order Value', fmtCurrency(report.summary.pendingOrderValue, c)],
    ['Pending Orders', report.summary.pendingOrderCount],
  ];
  for (const [label, val] of metrics) {
    ws.addRow([label, val]);
  }

  ws.addRow([]);
  const revHeader = ws.addRow(['Monthly Revenue']);
  revHeader.getCell(1).font = { bold: true, size: 12 };
  const revCols = ws.addRow(['Month', 'Revenue', 'Orders']);
  revCols.font = { bold: true };
  revCols.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3B5C' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  for (const m of report.revenueByMonth || []) {
    ws.addRow([m.monthName, fmtCurrency(m.revenue, c), m.orders]);
  }

  ws.addRow([]);
  const expHeader = ws.addRow(['Top Expense Categories']);
  expHeader.getCell(1).font = { bold: true, size: 12 };
  const expCols = ws.addRow(['Category', `Total Spent (${c})`, 'Orders']);
  expCols.font = { bold: true };
  for (const e of report.topExpenseCategories || []) {
    ws.addRow([e.category, fmtCurrency(e.totalSpent, c), e.orders]);
  }

  ws.columns.forEach(col => { col.width = 22; });
  return wb.xlsx.writeBuffer();
}

// ─── Dispatcher ───────────────────────────────────────────────

const EXCEL_EXPORTERS = {
  MONTHLY_SALES: exportMonthlySales,
  INVENTORY_STATUS: exportInventoryStatus,
  VENDOR_PERFORMANCE: exportVendorPerformance,
  FINANCIAL_SUMMARY: exportFinancialSummary,
};

async function exportToExcel(reportType, reportData) {
  const exporter = EXCEL_EXPORTERS[reportType];
  if (!exporter) throw new Error(`No Excel exporter for: ${reportType}`);
  return exporter(reportData);
}

module.exports = { exportToExcel, EXCEL_EXPORTERS };
