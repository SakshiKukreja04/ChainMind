import { useState, useEffect, useCallback } from 'react';
import { orderApi, type OrderResponse } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Truck, Package, MapPin, Check, Loader2, RefreshCw } from 'lucide-react';

const statusFlow = ['CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'] as const;

const statusColor: Record<string, string> = {
  CONFIRMED: 'bg-amber-100 text-amber-800',
  DISPATCHED: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
};

export default function DeliveryStatus() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { on } = useSocket();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderApi.vendorOrders();
      // Show only orders in delivery pipeline
      setOrders(
        res.orders.filter((o) =>
          ['CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(o.status),
        ),
      );
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to load deliveries', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const u1 = on('order:confirmed', () => fetchOrders());
    const u2 = on('order:dispatched', () => fetchOrders());
    const u3 = on('delivery:update', () => fetchOrders());
    const u4 = on('order:delivered', () => fetchOrders());
    return () => { u1(); u2(); u3(); u4(); };
  }, [on, fetchOrders]);

  const nextStatus = (current: string): 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | null => {
    const map: Record<string, 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED'> = {
      CONFIRMED: 'DISPATCHED',
      DISPATCHED: 'IN_TRANSIT',
      IN_TRANSIT: 'DELIVERED',
    };
    return map[current] || null;
  };

  const handleAdvance = async (orderId: string, current: string) => {
    const next = nextStatus(current);
    if (!next) return;
    setUpdatingId(orderId);
    try {
      await orderApi.updateDeliveryStatus(orderId, next);
      toast({ title: 'Updated', description: `Status → ${next.replace(/_/g, ' ')}` });
      fetchOrders();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Update failed', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Delivery Status</h1>
          <p className="text-muted-foreground">Track and update delivery progress.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Confirmed', icon: Package, count: orders.filter((o) => o.status === 'CONFIRMED').length, color: 'bg-amber-500/10 text-amber-600' },
          { label: 'Dispatched', icon: Truck, count: orders.filter((o) => o.status === 'DISPATCHED').length, color: 'bg-blue-500/10 text-blue-600' },
          { label: 'In Transit', icon: MapPin, count: orders.filter((o) => o.status === 'IN_TRANSIT').length, color: 'bg-purple-500/10 text-purple-600' },
          { label: 'Delivered', icon: Check, count: orders.filter((o) => o.status === 'DELIVERED').length, color: 'bg-green-500/10 text-green-600' },
        ].map((s) => (
          <div key={s.label} className="card-dashboard flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.color.split(' ')[0]}`}>
              <s.icon className={`h-5 w-5 ${s.color.split(' ')[1]}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Orders with progress */}
      <div className="space-y-4">
        {orders.map((order) => {
          const currentIdx = statusFlow.indexOf(order.status as any);
          const next = nextStatus(order.status);
          return (
            <div key={order.id} className="card-dashboard">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{order.productName}</span>
                    <Badge className={statusColor[order.status] || 'bg-gray-100 text-gray-800'}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>Qty: <strong>{order.quantity}</strong></span>
                    <span>•</span>
                    <span>${order.totalValue?.toLocaleString() ?? '—'}</span>
                    {order.expectedDeliveryDate && (
                      <>
                        <span>•</span>
                        <span>Due: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 max-w-xs">
                  <div className="flex items-center gap-1">
                    {statusFlow.map((_s, i) => (
                      <div key={i} className={`h-2 flex-1 rounded-full ${i <= currentIdx ? 'bg-primary' : 'bg-muted'}`} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {statusFlow.map((s) => (
                      <span key={s} className="text-[10px] text-muted-foreground">{s.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>

                {/* Action */}
                {next && (
                  <Button
                    size="sm"
                    onClick={() => handleAdvance(order.id, order.status)}
                    disabled={updatingId === order.id}
                  >
                    {updatingId === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Truck className="h-4 w-4 mr-1" />
                    )}
                    → {next.replace(/_/g, ' ')}
                  </Button>
                )}
                {order.status === 'DELIVERED' && (
                  <Badge className="bg-green-100 text-green-800">✓ Complete</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="card-dashboard text-center py-12">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No active deliveries</p>
          <p className="text-muted-foreground">Orders will appear as they're confirmed.</p>
        </div>
      )}
    </div>
  );
}
