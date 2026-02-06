import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, Package, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { alertApi, type AlertResponse } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { on } = useSocket();

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await alertApi.getAlerts();
      setAlerts(res.alerts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load alerts';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Real-time new alerts via Socket.IO
  useEffect(() => {
    const unsub = on('inventory:low-stock-alert', (data) => {
      const alert = data as AlertResponse;
      setAlerts((prev) => [alert, ...prev]);
      toast({ title: alert.title || 'Stock Alert', description: alert.message });
    });
    return unsub;
  }, [on, toast]);

  const handleMarkRead = async (id: string) => {
    try {
      await alertApi.markRead(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark alert';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertApi.markAllRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      toast({ title: 'Done', description: 'All alerts marked as read' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark alerts';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleDismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const unreadCount = alerts.filter((a) => !a.read).length;
  const criticalCount = alerts.filter((a) => a.severity === 'error').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const readCount = alerts.filter((a) => a.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchAlerts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{warningCount}</p>
            <p className="text-xs text-muted-foreground">Warning</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{alerts.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Check className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{readCount}</p>
            <p className="text-xs text-muted-foreground">Read</p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`card-dashboard ${!alert.read ? 'border-l-4' : ''} ${
                alert.severity === 'error'
                  ? 'border-l-destructive'
                  : 'border-l-warning'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-lg ${
                    alert.severity === 'error' ? 'bg-destructive/10' : 'bg-warning/10'
                  }`}
                >
                  <Package
                    className={`h-5 w-5 ${
                      alert.severity === 'error' ? 'text-destructive' : 'text-warning'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex gap-3 mt-2">
                        {alert.productName && (
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            {alert.productName} ({alert.productSku})
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Stock: {alert.currentStock} / Min: {alert.minThreshold}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!alert.read && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkRead(alert.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDismiss(alert.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="card-dashboard text-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No alerts</p>
          <p className="text-muted-foreground">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}
