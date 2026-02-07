import { useState, useEffect, useCallback } from 'react';
import { notificationApi, type AppNotification } from '@/lib/api';
import { useSocket } from './useSocket';

/**
 * Hook: manages notification state, polling, and real-time Socket.IO updates.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  // Fetch initial data
  const fetchNotifications = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        notificationApi.list({ limit: 30 }),
        notificationApi.unreadCount(),
      ]);
      setNotifications(
        (listRes.notifications || []).map((n) => ({ ...n, id: (n as unknown as Record<string, unknown>)._id as string || n.id })),
      );
      setUnreadCount(countRes.count);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time: listen for new notifications via Socket.IO
  useEffect(() => {
    const off = on('notification:new', (data: unknown) => {
      const notification = data as AppNotification & { _id?: string };
      // Only accept notifications addressed to the current user
      const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?.id;
      if (currentUserId && notification.userId && notification.userId !== currentUserId) return;
      const normalized: AppNotification = {
        ...notification,
        id: notification._id || notification.id,
      };
      setNotifications((prev) => [normalized, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
    return off;
  }, [on]);

  // Mark one notification as read
  const markRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  }, []);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
  };
}
