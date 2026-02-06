/**
 * Product Spec Hash Utility
 * Generates a deterministic SHA-256 hash from normalised product attributes
 * so that "the same product" across different businesses can be matched
 * for cooperative buying.
 *
 * Normalisation:
 *   1. name  → lowercase, trimmed, brand prefixes stripped, whitespace collapsed
 *   2. category → lowercase, trimmed
 *   3. unitSize (optional) → lowercase, trimmed
 *
 * The resulting hash is hex-encoded (no "0x" prefix) for easy indexing.
 */

const crypto = require('crypto');

/**
 * Strip common brand noise from a product name so that
 * "Panadol Extra 500mg" and "Generic Paracetamol 500mg" can still
 * match if the core token set overlaps enough.
 *
 * For Phase-1 we keep it simple: lowercase → trim → collapse whitespace.
 * A future iteration can add synonym dictionaries or ML embeddings.
 */
function normaliseName(raw) {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normaliseField(raw) {
  if (!raw) return '';
  return raw.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Generate a deterministic product-spec hash.
 *
 * @param {Object}  opts
 * @param {string}  opts.name      - Product name
 * @param {string}  opts.category  - Product category
 * @param {string}  [opts.unitSize] - e.g. "500mg", "1L", "250g"
 * @returns {string} 64-char hex SHA-256 hash
 */
function generateSpecHash({ name, category, unitSize }) {
  const canonical = [
    normaliseName(name),
    normaliseField(category),
    normaliseField(unitSize || ''),
  ].join('|');

  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

module.exports = {
  generateSpecHash,
  normaliseName,
  normaliseField,
};
