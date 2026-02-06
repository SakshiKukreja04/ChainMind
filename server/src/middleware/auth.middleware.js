/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header
 * Attaches decoded user data to req.user
 */

const { verifyToken } = require('../utils/jwt');

/**
 * Authentication Middleware
 * Checks for valid JWT token in Authorization header
 *
 * Expected format: Authorization: Bearer <token>
 *
 * On success: attaches decoded token to req.user
 * On failure: returns 401 Unauthorized
 */
const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Use Authorization: Bearer <token>',
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verifyToken(token);

    // Attach decoded token to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
};

module.exports = {
  authMiddleware,
};

