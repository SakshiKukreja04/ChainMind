/**
 * Notification Controller
 * REST endpoints for the notification bell icon:
 *   GET    /api/notifications          – list (paginated)
 *   GET    /api/notifications/unread-count
 *   PATCH  /api/notifications/:id/read – mark one read
 *   PATCH  /api/notifications/read-all – mark all read
 */

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
} = require('../services/notificationService');

/** GET /api/notifications */
const listNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const result = await getNotifications(req.user.userId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      unreadOnly: unreadOnly === 'true',
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('listNotifications error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/** GET /api/notifications/unread-count */
const unreadCount = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.userId);
    return res.json({ success: true, count });
  } catch (err) {
    console.error('unreadCount error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/** PATCH /api/notifications/:id/read */
const markRead = async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user.userId);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.json({ success: true, notification });
  } catch (err) {
    console.error('markRead error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/** PATCH /api/notifications/read-all */
const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await markAllRead(req.user.userId);
    return res.json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error('markAllRead error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  listNotifications,
  unreadCount,
  markRead,
  markAllNotificationsRead,
};
