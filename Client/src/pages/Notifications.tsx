import { useState, useEffect, useCallback } from 'react';
import { notificationApi, type AppNotification } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Package,
  Brain,
  TrendingUp,
  ShoppingCart,
  CheckCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';

function typeIcon(type: AppNotification['type']) {
  switch (type) {
    case 'REORDER_ALERT':
      return <ShoppingCart className="h-5 w-5 text-blue-500" />;
    case 'AI_NUDGE':
      return <Brain className="h-5 w-5 text-purple-500" />;
    case 'STOCK_UPDATE':
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    case 'ORDER_STATUS':
      return <Package className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
}

const TYPE_COLORS: Record<string, string> = {
  REORDER_ALERT: 'bg-blue-100 text-blue-700',
  AI_NUDGE: 'bg-purple-100 text-purple-700',
  STOCK_UPDATE: 'bg-green-100 text-green-700',
  ORDER_STATUS: 'bg-orange-100 text-orange-700',
};
const TYPE_LABELS: Record<string, string> = {
  REORDER_ALERT: 'Reorder',
  AI_NUDGE: 'AI Nudge',
  STOCK_UPDATE: 'Stock',
  ORDER_STATUS: 'Order',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { on } = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationApi.list({ limit: 10 });
      setNotifications(
        (res.notifications || []).map((n) => ({
          ...n,
          id: (n as unknown as Record<string, unknown>)._id as string || n.id,
        })),
      );
    } catch {
      toast({ title: 'Error', description: 'Failed to load notifications', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time
  useEffect(() => {
    const off = on('notification:new', (data: unknown) => {
      const n = data as AppNotification & { _id?: string };
      const currentUserId = JSON.parse(localStorage.getItem('chainmind_user') || '{}')?.id;
      if (currentUserId && n.userId && n.userId !== currentUserId) return;
      const normalized: AppNotification = { ...n, id: n._id || n.id };
      setNotifications((prev) => [normalized, ...prev].slice(0, 10));
    });
    return off;
  }, [on]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast({ title: 'Done', description: 'All notifications marked as read.' });
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            Your latest {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            {unreadCount > 0 && ` · ${unreadCount} unread`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchNotifications}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="card-dashboard flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="text-sm">When something happens, you'll see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card-dashboard flex items-start gap-4 cursor-pointer transition-colors hover:bg-muted/30 ${
                !n.read ? 'border-l-4 border-l-primary' : ''
              }`}
              onClick={() => !n.read && handleMarkRead(n.id)}
            >
              <div className="mt-1">{typeIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className={TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-600'}>
                    {TYPE_LABELS[n.type] || n.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
                </div>
                <p className="font-medium text-foreground">{n.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
