/**
 * Authentication Routes
 * POST /api/auth/signup - User registration
 * POST /api/auth/login - User login
 * GET /api/auth/verify - Verify token (protected)
 */

const express = require('express');
const router = express.Router();
const { signup, login, verify } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

/**
 * POST /api/auth/signup
 * Register new user
 *
 * Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123",
 *   "role": "OWNER" | "MANAGER" | "VENDOR",
 *   "businessId": "optional" (required for MANAGER/VENDOR)
 * }
 *
 * Response (201):
 * {
 *   "success": true,
 *   "token": "<JWT>",
 *   "user": { "id", "name", "email", "role", "businessId" }
 * }
 */
router.post('/signup', signup);

/**
 * POST /api/auth/login
 * Authenticate user
 *
 * Request body:
 * {
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "token": "<JWT>",
 *   "user": { "id", "name", "email", "role", "businessId" }
 * }
 */
router.post('/login', login);

/**
 * GET /api/auth/verify
 * Verify JWT token (protected route)
 * Headers: Authorization: Bearer <token>
 *
 * Response (200):
 * {
 *   "success": true,
 *   "user": { "id", "name", "email", "role", "businessId" }
 * }
 */
router.get('/verify', authMiddleware, verify);

module.exports = router;
