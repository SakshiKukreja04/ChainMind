/**
 * Seed SalesHistory
 * ─────────────────
 * Generates 1–2 years of synthetic daily sales data with:
 *   • Monthly seasonality (June–Aug spike, Dec spike, Jan–Feb dip)
 *   • Location bias (Mumbai > Pune > Delhi > Bangalore > Chennai)
 *   • Weekly pattern  (weekends lower)
 *   • Random daily variance
 *
 * Usage:
 *   node scripts/seedSalesHistory.js               # use real product/vendor/business IDs from DB
 *   node scripts/seedSalesHistory.js --standalone   # use dummy ObjectIds (no DB deps)
 *
 * Also exports the raw rows as JSON for AI-service training:
 *   server/scripts/sales_history_export.json
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const SalesHistory = require('../src/models/SalesHistory.model');
const Product = require('../src/models/Product.model');
const fs = require('fs');

// ─── Configuration ──────────────────────────────────────────────

const CITIES = ['mumbai', 'pune', 'delhi', 'bangalore', 'chennai'];

/** Relative demand multiplier per city */
const CITY_BIAS = {
  mumbai: 1.35,
  pune: 1.05,
  delhi: 1.15,
  bangalore: 1.0,
  chennai: 0.85,
};

/**
 * Monthly seasonality multiplier (0 = Jan … 11 = Dec).
 * Summer spike (May–Jul), festive spike (Oct–Dec), winter dip (Jan–Feb).
 */
const MONTH_SEASONALITY = [
  0.70,  // Jan
  0.72,  // Feb
  0.85,  // Mar
  0.95,  // Apr
  1.15,  // May
  1.30,  // Jun  ← peak summer
  1.35,  // Jul  ← peak summer
  1.20,  // Aug
  1.00,  // Sep
  1.10,  // Oct  ← festive
  1.25,  // Nov  ← festive
  1.30,  // Dec  ← festive
];

/** Weekday multiplier (0 = Sun … 6 = Sat) */
const WEEKDAY_FACTOR = [0.70, 1.0, 1.05, 1.02, 0.98, 1.10, 0.80];

const HISTORY_DAYS = 548; // ~1.5 years

// ─── Helpers ────────────────────────────────────────────────────

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Generate daily sales for one product × one city over HISTORY_DAYS.
 */
function generateSeries(baseDemand, city) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - HISTORY_DAYS);

  const rows = [];
  for (let d = 0; d < HISTORY_DAYS; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);

    const month = date.getMonth();           // 0-11
    const dayOfWeek = date.getDay();         // 0=Sun

    const seasonal = MONTH_SEASONALITY[month];
    const cityMult = CITY_BIAS[city] || 1.0;
    const weekday = WEEKDAY_FACTOR[dayOfWeek];
    const noise = randomBetween(0.75, 1.25); // ±25 % daily variance

    const raw = baseDemand * seasonal * cityMult * weekday * noise;
    const quantitySold = Math.max(0, Math.round(raw));

    rows.push({ date, quantitySold, city });
  }
  return rows;
}

// ─── Main ───────────────────────────────────────────────────────

async function seed() {
  const standalone = process.argv.includes('--standalone');

  await connectDB();

  // Determine products to seed from
  let products;
  if (standalone) {
    // Generate 5 dummy product combos
    products = Array.from({ length: 5 }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      businessId: new mongoose.Types.ObjectId(),
      vendorId: new mongoose.Types.ObjectId(),
      baseDemand: 15 + i * 8,
    }));
    console.log('⚙  Standalone mode — using dummy ObjectIds');
  } else {
    // Pull real products from DB
    const dbProducts = await Product.find({}).limit(20).lean();
    if (dbProducts.length === 0) {
      console.error('✗ No products in DB. Run with --standalone or seed products first.');
      process.exit(1);
    }
    products = dbProducts.map((p) => ({
      _id: p._id,
      businessId: p.businessId,
      vendorId: p.vendorId || null,
      baseDemand: randomBetween(10, 50),
    }));
    console.log(`⚙  Found ${products.length} products in DB`);
  }

  // Clear existing sales history
  const deleted = await SalesHistory.deleteMany({});
  console.log(`🗑  Cleared ${deleted.deletedCount} existing SalesHistory documents`);

  const bulkOps = [];
  const exportRows = [];

  for (const prod of products) {
    for (const city of CITIES) {
      const series = generateSeries(prod.baseDemand, city);
      for (const row of series) {
        const doc = {
          productId: prod._id,
          businessId: prod.businessId,
          vendorId: prod.vendorId,
          date: row.date,
          quantitySold: row.quantitySold,
          city: row.city,
        };
        bulkOps.push({ insertOne: { document: doc } });

        // For JSON export (training)
        exportRows.push({
          productId: String(prod._id),
          businessId: String(prod.businessId),
          vendorId: prod.vendorId ? String(prod.vendorId) : null,
          date: row.date.toISOString().slice(0, 10),
          quantitySold: row.quantitySold,
          city: row.city,
        });
      }
    }
  }

  // Batch insert
  console.log(`📦 Inserting ${bulkOps.length} SalesHistory documents …`);
  const BATCH = 5000;
  for (let i = 0; i < bulkOps.length; i += BATCH) {
    await SalesHistory.bulkWrite(bulkOps.slice(i, i + BATCH), { ordered: false });
    process.stdout.write(`   ${Math.min(i + BATCH, bulkOps.length)} / ${bulkOps.length}\r`);
  }
  console.log(`\n✓ Inserted ${bulkOps.length} documents`);

  // Export JSON for AI-service training
  const exportPath = path.join(__dirname, 'sales_history_export.json');
  fs.writeFileSync(exportPath, JSON.stringify(exportRows, null, 2));
  console.log(`📄 Exported ${exportRows.length} rows → ${exportPath}`);

  await disconnectDB();
  console.log('✅ SalesHistory seeding complete');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
