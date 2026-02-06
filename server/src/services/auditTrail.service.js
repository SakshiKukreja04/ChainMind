/**
 * Audit Trail Service
 * Provides cryptographic hash-chaining for order lifecycle events.
 *
 * Each event:
 *   1. Builds a canonical snapshot of the order
 *   2. Computes SHA-256( snapshot + previousHash )
 *   3. Stores an immutable AuditLog document
 *
 * Verification walks the chain for a given order and recomputes
 * every hash, reporting VERIFIED or PENDING per entry.
 */

const crypto = require('crypto');
const AuditLog = require('../models/AuditLog.model');

// ─────────────────────────────────────────────────────────────────
// Canonical serialisation
// ─────────────────────────────────────────────────────────────────

/**
 * Build a deterministic, sorted-key JSON string from an order document.
 * Only includes fields that are meaningful for integrity — no Mongoose
 * internals, no __v / updatedAt noise.
 */
function buildOrderSnapshot(order) {
  return {
    _id: str(order._id),
    productId: str(order.productId?._id || order.productId),
    vendorId: str(order.vendorId?._id || order.vendorId),
    businessId: str(order.businessId),
    quantity: order.quantity,
    totalValue: order.totalValue ?? 0,
    status: order.status,
    createdBy: str(order.createdBy),
    approvedBy: str(order.approvedBy) || null,
    expectedDeliveryDate: order.expectedDeliveryDate
      ? new Date(order.expectedDeliveryDate).toISOString()
      : null,
    actualDeliveryDate: order.actualDeliveryDate
      ? new Date(order.actualDeliveryDate).toISOString()
      : null,
    dispatchedAt: order.dispatchedAt
      ? new Date(order.dispatchedAt).toISOString()
      : null,
    deliveredAt: order.deliveredAt
      ? new Date(order.deliveredAt).toISOString()
      : null,
    rejectionReason: order.rejectionReason || null,
  };
}

/** Safely coerce ObjectId → string */
function str(val) {
  return val ? String(val) : null;
}

/**
 * Canonical JSON: keys sorted alphabetically, no whitespace.
 */
function canonicalise(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

// ─────────────────────────────────────────────────────────────────
// Hashing
// ─────────────────────────────────────────────────────────────────

/**
 * SHA-256( canonicalSnapshot + previousHash )
 * Returns hex-encoded hash prefixed with "0x" for UI parity with
 * the existing Blockchain page.
 */
function computeHash(snapshot, previousHash) {
  const payload = canonicalise(snapshot) + (previousHash || '');
  return '0x' + crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

/**
 * Record an audit log entry for an order lifecycle event.
 *
 * @param {Object}  order      - Mongoose order document (populated or plain)
 * @param {string}  action     - e.g. 'ORDER_CREATED', 'ORDER_APPROVED'
 * @param {string}  userId     - ObjectId string of the user who triggered the event
 * @param {string}  businessId - ObjectId string of the business
 * @returns {Promise<Object>}  The created AuditLog document
 */
async function recordAuditEntry(order, action, userId, businessId) {
  try {
    // 1. Build snapshot
    const snapshot = buildOrderSnapshot(order);

    // 2. Find previous entry in this order's chain
    const previous = await AuditLog.findOne({ orderId: order._id })
      .sort({ timestamp: -1 })
      .select('dataHash')
      .lean();

    const previousHash = previous ? previous.dataHash : null;

    // 3. Compute chained hash
    const dataHash = computeHash(snapshot, previousHash);

    // 4. Persist
    const entry = await AuditLog.create({
      orderId: order._id,
      action,
      dataHash,
      previousHash,
      status: 'VERIFIED',
      timestamp: new Date(),
      createdBy: userId || null,
      businessId,
      orderSnapshot: snapshot,
    });

    console.log(
      `✓ AuditLog: ${action} order=${str(order._id)} hash=${dataHash.slice(0, 18)}…`,
    );

    return entry;
  } catch (err) {
    // Audit failures must never break the order flow
    console.error('AuditLog recordAuditEntry failed:', err.message);
    return null;
  }
}

/**
 * Verify the full hash chain for an order.
 *
 * Walks every AuditLog entry (oldest → newest), recomputes each
 * hash from `orderSnapshot + previousHash`, and compares to the
 * stored `dataHash`.
 *
 * @param {string} orderId
 * @returns {Promise<Object>} { valid: boolean, entries: [...] }
 */
async function verifyOrderChain(orderId) {
  const entries = await AuditLog.find({ orderId })
    .sort({ timestamp: 1 })
    .lean();

  if (!entries.length) {
    return { valid: true, entries: [], message: 'No audit entries for this order' };
  }

  let chainValid = true;
  const results = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPrevHash = i === 0 ? null : entries[i - 1].dataHash;
    const recomputedHash = computeHash(entry.orderSnapshot, expectedPrevHash);

    const hashMatch = recomputedHash === entry.dataHash;
    const prevMatch = entry.previousHash === expectedPrevHash;
    const entryValid = hashMatch && prevMatch;

    if (!entryValid) chainValid = false;

    results.push({
      id: entry._id,
      action: entry.action,
      timestamp: entry.timestamp,
      dataHash: entry.dataHash,
      previousHash: entry.previousHash,
      status: entryValid ? 'VERIFIED' : 'PENDING',
      recomputedHash,
      hashMatch,
      prevMatch,
    });
  }

  return { valid: chainValid, entries: results };
}

/**
 * Verify a single audit entry by recomputing its hash.
 *
 * @param {string} entryId - AuditLog _id
 * @returns {Promise<Object>}
 */
async function verifySingleEntry(entryId) {
  const entry = await AuditLog.findById(entryId).lean();
  if (!entry) return { valid: false, message: 'Entry not found' };

  // Find the previous entry
  const previous = await AuditLog.findOne({
    orderId: entry.orderId,
    timestamp: { $lt: entry.timestamp },
  })
    .sort({ timestamp: -1 })
    .select('dataHash')
    .lean();

  const expectedPrevHash = previous ? previous.dataHash : null;
  const recomputedHash = computeHash(entry.orderSnapshot, expectedPrevHash);

  const valid = recomputedHash === entry.dataHash && entry.previousHash === expectedPrevHash;

  return {
    valid,
    status: valid ? 'VERIFIED' : 'PENDING',
    entry: {
      id: entry._id,
      orderId: entry.orderId,
      action: entry.action,
      dataHash: entry.dataHash,
      recomputedHash,
      hashMatch: recomputedHash === entry.dataHash,
      previousHash: entry.previousHash,
      expectedPrevHash,
      prevMatch: entry.previousHash === expectedPrevHash,
    },
  };
}

module.exports = {
  recordAuditEntry,
  verifyOrderChain,
  verifySingleEntry,
  // Exposed for testing
  buildOrderSnapshot,
  computeHash,
  canonicalise,
};
