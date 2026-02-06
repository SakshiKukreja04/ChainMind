/**
 * Notification Service
 * Creates in-app notifications, persists to MongoDB, and emits via Socket.IO.
 *
 * ❌  NO emails to SME users.
 * ✅  Socket.IO delivery is failure-safe (logged, never throws).
 */

const Notification = require('../models/Notification.model');
const { User } = require('../models');
const { getSocket } = require('../sockets');

// ───────────────────────────────────────────────────────────────
// Internal helper: emit to socket in a failure-safe manner
// ───────────────────────────────────────────────────────────────
function safeEmit(event, payload) {
  try {
    const io = getSocket();
    io.emit(event, payload);
  } catch (err) {
    console.warn(`[NotificationService] Socket emit failed (${event}):`, err.message);
  }
}

// ───────────────────────────────────────────────────────────────
// createNotification
// Persists + emits a notification for a single user
// ───────────────────────────────────────────────────────────────
/**
 * @param {Object} opts
 * @param {string} opts.userId        – target user
 * @param {string} opts.businessId    – business context
 * @param {'REORDER_ALERT'|'AI_NUDGE'|'STOCK_UPDATE'|'ORDER_STATUS'} opts.type
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.referenceId]
 * @param {string} [opts.referenceType]  – 'Order' | 'Product' | 'AiSuggestion'
 * @param {Object} [opts.metadata]
 * @returns {Promise<Object>} created notification document
 */
async function createNotification({
  userId,
  businessId,
  type,
  title,
  message,
  referenceId = null,
  referenceType = null,
  metadata = {},
}) {
  try {
    const notification = await Notification.create({
      userId,
      businessId,
      type,
      title,
      message,
      referenceId,
      referenceType,
      metadata,
    });

    // Emit via Socket.IO (failure-safe)
    safeEmit('notification:new', {
      id: notification._id,
      userId: notification.userId,
      businessId: notification.businessId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      referenceId: notification.referenceId,
      referenceType: notification.referenceType,
      metadata: notification.metadata,
      read: false,
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (err) {
    console.error('[NotificationService] createNotification failed:', err.message);
    return null; // failure-safe: never throw
  }
}

// ───────────────────────────────────────────────────────────────
// notifyAllBusinessUsers
// Creates a notification for every OWNER + MANAGER in a business
// ───────────────────────────────────────────────────────────────
async function notifyAllBusinessUsers({
  businessId,
  type,
  title,
  message,
  referenceId = null,
  referenceType = null,
  metadata = {},
}) {
  try {
    const users = await User.find({
      businessId,
      role: { $in: ['OWNER', 'MANAGER', 'VENDOR'] },
    }).select('_id');

    const notifications = await Promise.all(
      users.map((u) =>
        createNotification({
          userId: u._id,
          businessId,
          type,
          title,
          message,
          referenceId,
          referenceType,
          metadata,
        }),
      ),
    );

    return notifications.filter(Boolean);
  } catch (err) {
    console.error('[NotificationService] notifyAllBusinessUsers failed:', err.message);
    return [];
  }
}

// ───────────────────────────────────────────────────────────────
// getNotifications  –  paginated list for bell icon
// ───────────────────────────────────────────────────────────────
async function getNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const filter = { userId };
  if (unreadOnly) filter.read = false;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return { notifications, total, page, limit };
}

// ───────────────────────────────────────────────────────────────
// getUnreadCount
// ───────────────────────────────────────────────────────────────
async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

// ───────────────────────────────────────────────────────────────
// markAsRead  /  markAllRead
// ───────────────────────────────────────────────────────────────
async function markAsRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true },
  );
}

async function markAllRead(userId) {
  return Notification.updateMany({ userId, read: false }, { read: true });
}

module.exports = {
  createNotification,
  notifyAllBusinessUsers,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
};
