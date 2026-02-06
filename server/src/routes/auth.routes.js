/**
 * Authentication Routes
 * POST /api/auth/signup - User registration
 * POST /api/auth/login - User login
 * GET /api/auth/verify - Verify token (protected)
 * POST /api/auth/invite - Invite team member (protected, OWNER only)
 * GET /api/auth/team - Get team members (protected, OWNER only)
 */

const express = require('express');
const router = express.Router();
const { signup, login, verify, inviteTeamMember, getTeamMembers } = require('../controllers/auth.controller');
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

/**
 * POST /api/auth/invite
 * Invite team member (OWNER only)
 * Headers: Authorization: Bearer <token>
 *
 * Request body:
 * {
 *   "name": "Team Member Name",
 *   "email": "member@example.com",
 *   "password": "tempPassword123",
 *   "role": "MANAGER" | "VENDOR"
 * }
 *
 * Response (201):
 * {
 *   "success": true,
 *   "member": { "id", "name", "email", "role", "businessId" }
 * }
 */
router.post('/invite', authMiddleware, inviteTeamMember);

/**
 * GET /api/auth/team
 * Get all team members for business (OWNER only)
 * Headers: Authorization: Bearer <token>
 *
 * Response (200):
 * {
 *   "success": true,
 *   "members": [{ "id", "name", "email", "role", "createdAt" }]
 * }
 */
router.get('/team', authMiddleware, getTeamMembers);

module.exports = router;
