import { useState } from 'react';
import { Bell, Package, Brain, TrendingUp, ShoppingCart, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/lib/api';
import type { UserRole } from '@/types';

/** Icon map for notification types */
function NotificationIcon({ type }: { type: AppNotification['type'] }) {
  switch (type) {
    case 'REORDER_ALERT':
      return <ShoppingCart className="h-4 w-4 text-blue-500" />;
    case 'AI_NUDGE':
      return <Brain className="h-4 w-4 text-purple-500" />;
    case 'STOCK_UPDATE':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'ORDER_STATUS':
      return <Package className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

/** Badge color for notification types */
function typeBadge(type: AppNotification['type']) {
  const colors: Record<string, string> = {
    REORDER_ALERT: 'bg-blue-100 text-blue-700',
    AI_NUDGE: 'bg-purple-100 text-purple-700',
    STOCK_UPDATE: 'bg-green-100 text-green-700',
    ORDER_STATUS: 'bg-orange-100 text-orange-700',
  };
  const labels: Record<string, string> = {
    REORDER_ALERT: 'Reorder',
    AI_NUDGE: 'AI Nudge',
    STOCK_UPDATE: 'Stock',
    ORDER_STATUS: 'Order',
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type}
    </span>
  );
}

/** Time-ago helper */
function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Single notification row */
function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`flex gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
        !notification.read ? 'bg-muted/30' : ''
      }`}
      onClick={() => !notification.read && onMarkRead(notification.id)}
    >
      <div className="mt-0.5">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {typeBadge(notification.type)}
          <span className="text-[11px] text-muted-foreground">{timeAgo(notification.createdAt)}</span>
          {!notification.read && (
            <span className="ml-auto h-2 w-2 rounded-full bg-blue-500 shrink-0" />
          )}
        </div>
        <p className="text-sm font-medium leading-tight truncate">{notification.title}</p>
        <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-0.5">
          {notification.message}
        </p>
      </div>
    </div>
  );
}

/** Map role to the notifications route prefix */
function notificationsPath(role: UserRole) {
  switch (role) {
    case 'sme-owner': return '/sme/notifications';
    case 'inventory-manager': return '/inventory/notifications';
    case 'vendor': return '/vendor/notifications';
  }
}

/** Main notification bell + dropdown panel */
export function NotificationPanel({ role }: { role: UserRole }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const top3 = notifications.slice(0, 3);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />

        {/* Top 3 notifications */}
        {top3.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {top3.map((n) => (
              <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
            ))}
          </div>
        )}

        {/* View all link */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <button
              onClick={() => { setOpen(false); navigate(notificationsPath(role)); }}
              className="w-full py-3 text-center text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
            >
              View all notifications
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
