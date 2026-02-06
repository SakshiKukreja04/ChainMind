/**
 * JWT Utilities
 * Handles JWT token generation and verification
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

/**
 * Generate JWT token
 * @param {Object} payload - Token payload (userId, role, businessId)
 * @param {String} expiresIn - Token expiration time (default: 7 days)
 * @returns {String} JWT token
 *
 * Payload should contain:
 * {
 *   userId: ObjectId,
 *   role: "OWNER" | "MANAGER" | "VENDOR",
 *   businessId: ObjectId
 * }
 */
const generateToken = (payload, expiresIn = '7d') => {
  try {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });
    return token;
  } catch (error) {
    console.error('Token Generation Error:', error.message);
    throw error;
  }
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 *
 * Returns:
 * {
 *   userId: ObjectId,
 *   role: "OWNER" | "MANAGER" | "VENDOR",
 *   businessId: ObjectId,
 *   iat: timestamp,
 *   exp: timestamp
 * }
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Token Verification Error:', error.message);
    throw error;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};

