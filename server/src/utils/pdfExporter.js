/**
 * PDF Exporter Utility
 * Generates PDF buffers from report data using PDFKit.
 * Respects Business.currency for all financial values.
 */

let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch {
  PDFDocument = null;
}

function ensurePDFKit() {
  if (!PDFDocument) {
    throw new Error('pdfkit is not installed. Run: npm install pdfkit');
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

/**
 * Helper: create a PDF document and collect into a buffer via promise.
 */
function createPdfStream() {
  ensurePDFKit();
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  const promise = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, promise };
}

function addTitle(doc, title, subtitle) {
  doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#666666').text(subtitle);
  doc.fillColor('#000000');
  doc.moveDown(1);
}

function addSection(doc, label) {
  doc.moveDown(0.5);
  doc.fontSize(13).font('Helvetica-Bold').text(label);
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
}

function addKV(doc, key, value) {
  doc.font('Helvetica-Bold').text(`${key}: `, { continued: true });
  doc.font('Helvetica').text(String(value));
}

function addTableHeader(doc, cols, colWidths, y) {
  doc.save();
  doc.rect(40, y, colWidths.reduce((a, b) => a + b, 0), 18).fill('#1A3B5C');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
  let x = 42;
  for (let i = 0; i < cols.length; i++) {
    doc.text(cols[i], x, y + 4, { width: colWidths[i] - 4 });
    x += colWidths[i];
  }
  doc.restore();
  doc.fillColor('#000000').font('Helvetica').fontSize(8);
  return y + 20;
}

function addTableRow(doc, values, colWidths, y, highlight = false) {
  if (y > 740) {
    doc.addPage();
    y = 40;
  }
  if (highlight) {
    doc.save();
    doc.rect(40, y, colWidths.reduce((a, b) => a + b, 0), 16).fill('#FFF0F0');
    doc.restore();
    doc.fillColor('#CC0000');
  }
  let x = 42;
  for (let i = 0; i < values.length; i++) {
    doc.text(String(values[i] ?? ''), x, y + 3, { width: colWidths[i] - 4 });
    x += colWidths[i];
  }
  if (highlight) doc.fillColor('#000000');
  return y + 16;
}

// ─── Monthly Sales PDF ────────────────────────────────────────

async function pdfMonthlySales(report) {
  const { doc, promise } = createPdfStream();
  const c = report.currency;

  addTitle(doc, `Monthly Sales Report`, `${report.businessName} | Currency: ${c} | ${new Date(report.generatedAt).toLocaleString()}`);

  addSection(doc, 'Summary');
  addKV(doc, 'Total Revenue', fmtCurrency(report.summary.totalRevenue, c));
  addKV(doc, 'Total Orders', report.summary.totalOrders);
  addKV(doc, 'Avg Order Value', fmtCurrency(report.summary.avgOrderValue, c));

  addSection(doc, 'Monthly Breakdown');
  const cols = ['Month', 'Revenue', 'Orders', 'Units'];
  const widths = [120, 120, 80, 80];
  let y = addTableHeader(doc, cols, widths, doc.y);
  for (const m of report.monthlySales || []) {
    y = addTableRow(doc, [m.monthName, fmtCurrency(m.revenue, c), m.orders, m.units], widths, y);
  }

  if ((report.topProducts || []).length > 0) {
    doc.moveDown(1);
    addSection(doc, 'Top Products');
    const pcols = ['Product', 'SKU', 'Revenue', 'Orders'];
    const pwidths = [160, 100, 120, 80];
    y = addTableHeader(doc, pcols, pwidths, doc.y);
    for (const p of report.topProducts) {
      y = addTableRow(doc, [p.productName, p.sku, fmtCurrency(p.revenue, c), p.orders], pwidths, y);
    }
  }

  doc.end();
  return promise;
}

// ─── Inventory Status PDF ─────────────────────────────────────

async function pdfInventoryStatus(report) {
  const { doc, promise } = createPdfStream();
  const c = report.currency;

  addTitle(doc, 'Inventory Status Report', `${report.businessName} | Currency: ${c} | ${new Date(report.generatedAt).toLocaleString()}`);

  addSection(doc, 'Summary');
  addKV(doc, 'Total Products', report.summary.totalProducts);
  addKV(doc, 'Total Cost Value', fmtCurrency(report.summary.totalCostValue, c));
  addKV(doc, 'Low Stock', report.summary.lowStock);
  addKV(doc, 'Critical', report.summary.critical);
  addKV(doc, 'Out of Stock', report.summary.outOfStock);

  addSection(doc, 'Product Details');
  const cols = ['Product', 'SKU', 'Stock', 'Min', 'Avg 30d', 'Days Left', `Value (${c})`, 'Status'];
  const widths = [90, 55, 40, 40, 50, 50, 75, 60];
  let y = addTableHeader(doc, cols, widths, doc.y);

  for (const item of report.items || []) {
    const status = item.isOutOfStock ? 'OUT' : item.isCritical ? 'CRITICAL' : item.isLowStock ? 'LOW' : 'OK';
    const hl = item.isOutOfStock || item.isCritical;
    y = addTableRow(doc, [
      item.name, item.sku, item.currentStock, item.minThreshold,
      item.avgConsumption30d, item.daysOfStockRemaining ?? '-',
      fmtCurrency(item.costValue, c), status,
    ], widths, y, hl);
  }

  doc.end();
  return promise;
}

// ─── Vendor Performance PDF ───────────────────────────────────

async function pdfVendorPerformance(report) {
  const { doc, promise } = createPdfStream();
  const c = report.currency;

  addTitle(doc, 'Vendor Performance Report', `${report.businessName} | Currency: ${c} | ${new Date(report.generatedAt).toLocaleString()}`);

  addSection(doc, 'Summary');
  addKV(doc, 'Total Vendors', report.summary.totalVendors);
  addKV(doc, 'Avg Reliability', `${report.summary.avgReliability}/100`);
  addKV(doc, 'Top Vendor', report.summary.topVendor);

  addSection(doc, 'Vendor Details');
  const cols = ['Vendor', 'Score', 'Orders', 'Fulfilled', 'Avg Days', 'On-Time', 'Delay', `Value`];
  const widths = [100, 45, 50, 55, 55, 50, 45, 75];
  let y = addTableHeader(doc, cols, widths, doc.y);

  for (const v of report.vendors || []) {
    y = addTableRow(doc, [
      v.name, v.reliabilityScore, v.totalOrders, v.totalFulfilled,
      v.avgDeliveryDays ?? '-', v.onTimeDeliveryRate != null ? `${v.onTimeDeliveryRate}%` : '-',
      `${v.delayRate}%`, fmtCurrency(v.totalOrderValue, c),
    ], widths, y);
  }

  doc.end();
  return promise;
}

// ─── Financial Summary PDF ────────────────────────────────────

async function pdfFinancialSummary(report) {
  const { doc, promise } = createPdfStream();
  const c = report.currency;

  addTitle(doc, 'Financial Summary', `${report.businessName} | Currency: ${c} | ${new Date(report.generatedAt).toLocaleString()}`);

  addSection(doc, 'Key Metrics');
  addKV(doc, 'Total Revenue', fmtCurrency(report.summary.totalRevenue, c));
  addKV(doc, 'Inventory Cost Value', fmtCurrency(report.summary.inventoryCostValue, c));
  addKV(doc, 'Inventory Selling Value', fmtCurrency(report.summary.inventorySellingValue, c));
  addKV(doc, 'Potential Margin', fmtCurrency(report.summary.potentialMargin, c));
  addKV(doc, 'Cash Tied in Inventory', fmtCurrency(report.summary.cashTiedInInventory, c));
  addKV(doc, 'Pending Order Value', fmtCurrency(report.summary.pendingOrderValue, c));

  addSection(doc, 'Monthly Revenue');
  const cols = ['Month', 'Revenue', 'Orders'];
  const widths = [150, 150, 80];
  let y = addTableHeader(doc, cols, widths, doc.y);
  for (const m of report.revenueByMonth || []) {
    y = addTableRow(doc, [m.monthName, fmtCurrency(m.revenue, c), m.orders], widths, y);
  }

  if ((report.topExpenseCategories || []).length > 0) {
    doc.moveDown(1);
    addSection(doc, 'Top Expense Categories');
    const ecols = ['Category', `Spent (${c})`, 'Orders'];
    const ewidths = [160, 150, 80];
    y = addTableHeader(doc, ecols, ewidths, doc.y);
    for (const e of report.topExpenseCategories) {
      y = addTableRow(doc, [e.category, fmtCurrency(e.totalSpent, c), e.orders], ewidths, y);
    }
  }

  doc.end();
  return promise;
}

// ─── Dispatcher ───────────────────────────────────────────────

const PDF_EXPORTERS = {
  MONTHLY_SALES: pdfMonthlySales,
  INVENTORY_STATUS: pdfInventoryStatus,
  VENDOR_PERFORMANCE: pdfVendorPerformance,
  FINANCIAL_SUMMARY: pdfFinancialSummary,
};

async function exportToPdf(reportType, reportData) {
  const exporter = PDF_EXPORTERS[reportType];
  if (!exporter) throw new Error(`No PDF exporter for: ${reportType}`);
  return exporter(reportData);
}

module.exports = { exportToPdf, PDF_EXPORTERS };
