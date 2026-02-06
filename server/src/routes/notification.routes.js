/**
 * Notification Routes
 * Bell-icon endpoints for ALL authenticated users (OWNER, MANAGER, VENDOR)
 *
 * GET    /api/notifications            – paginated list
 * GET    /api/notifications/unread-count
 * PATCH  /api/notifications/:id/read   – mark one as read
 * PATCH  /api/notifications/read-all   – mark all as read
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  listNotifications,
  unreadCount,
  markRead,
  markAllNotificationsRead,
} = require('../controllers/notification.controller');

router.get('/', authMiddleware, listNotifications);
router.get('/unread-count', authMiddleware, unreadCount);
router.patch('/read-all', authMiddleware, markAllNotificationsRead);
router.patch('/:id/read', authMiddleware, markRead);

module.exports = router;
