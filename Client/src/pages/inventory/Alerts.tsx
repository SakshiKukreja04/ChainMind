import { useState } from 'react';
import { mockAlerts } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, Package, Truck, Settings, Check, X } from 'lucide-react';
import type { Alert } from '@/types';

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);

  const handleMarkRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'stock': return Package;
      case 'delivery': return Truck;
      case 'vendor': return Settings;
      default: return Bell;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
          </p>
        </div>
        <Button variant="outline" onClick={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}>
          Mark All Read
        </Button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{alerts.filter(a => a.severity === 'error').length}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{alerts.filter(a => a.severity === 'warning').length}</p>
            <p className="text-xs text-muted-foreground">Warning</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{alerts.filter(a => a.severity === 'info').length}</p>
            <p className="text-xs text-muted-foreground">Info</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Check className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{alerts.filter(a => a.read).length}</p>
            <p className="text-xs text-muted-foreground">Read</p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = getAlertIcon(alert.type);
          return (
            <div 
              key={alert.id} 
              className={`card-dashboard ${!alert.read ? 'border-l-4' : ''} ${
                alert.severity === 'error' ? 'border-l-destructive' :
                alert.severity === 'warning' ? 'border-l-warning' :
                'border-l-primary'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  alert.severity === 'error' ? 'bg-destructive/10' :
                  alert.severity === 'warning' ? 'bg-warning/10' :
                  'bg-primary/10'
                }`}>
                  <Icon className={`h-5 w-5 ${
                    alert.severity === 'error' ? 'text-destructive' :
                    alert.severity === 'warning' ? 'text-warning' :
                    'text-primary'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{alert.createdAt}</p>
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
          );
        })}
      </div>

      {alerts.length === 0 && (
        <div className="card-dashboard text-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No alerts</p>
          <p className="text-muted-foreground">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}
