import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  ShoppingCart,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Brain,
  Sparkles,
} from 'lucide-react';
import { orderApi, type OrderResponse } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  DRAFT: { label: 'Draft', class: 'bg-muted text-muted-foreground' },
  PENDING_APPROVAL: { label: 'Pending', class: 'bg-warning/10 text-warning' },
  APPROVED: { label: 'Approved', class: 'bg-success/10 text-success' },
  CONFIRMED: { label: 'Confirmed', class: 'bg-amber-100 text-amber-800' },
  DISPATCHED: { label: 'Dispatched', class: 'bg-purple-100 text-purple-800' },
  REJECTED: { label: 'Rejected', class: 'bg-destructive/10 text-destructive' },
  VENDOR_REJECTED: { label: 'Vendor Rejected', class: 'bg-red-100 text-red-800' },
  DELAY_REQUESTED: { label: 'Delay Requested', class: 'bg-orange-100 text-orange-800' },
  DELIVERED: { label: 'Delivered', class: 'bg-primary/10 text-primary' },
};

export default function Orders() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { toast } = useToast();
  const { on } = useSocket();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderApi.list(statusFilter || undefined);
      setOrders(res.orders);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load orders';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Real-time updates
  useEffect(() => {
    const unsub = on('order:approved', () => { fetchOrders(); });
    return unsub;
  }, [on, fetchOrders]);

  useEffect(() => {
    const unsub = on('order:rejected', () => { fetchOrders(); });
    return unsub;
  }, [on, fetchOrders]);

  useEffect(() => {
    const unsub = on('order:pending-approval', () => { fetchOrders(); });
    return unsub;
  }, [on, fetchOrders]);

  useEffect(() => {
    const unsub1 = on('order:confirmed', () => { fetchOrders(); });
    const unsub2 = on('order:dispatched', () => { fetchOrders(); });
    const unsub3 = on('order:delivered', () => { fetchOrders(); });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on, fetchOrders]);

  useEffect(() => {
    const unsub1 = on('order:status-change', () => { fetchOrders(); });
    const unsub2 = on('order:vendor-rejected', (data: any) => {
      fetchOrders();
      toast({
        title: 'Order Rejected by Vendor',
        description: `${data?.productName || 'An order'} was rejected${data?.reason ? `: ${data.reason}` : ''}`,
        variant: 'destructive',
      });
    });
    const unsub3 = on('order:delay-requested', (data: any) => {
      fetchOrders();
      toast({
        title: 'Delay Requested',
        description: `${data?.productName || 'An order'} — vendor requested delay${data?.reason ? `: ${data.reason}` : ''}`,
      });
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on, fetchOrders, toast]);

  const filteredOrders = orders.filter(
    (o) =>
      o.productName?.toLowerCase().includes(search.toLowerCase()) ||
      o.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
      o.id?.toLowerCase().includes(search.toLowerCase()),
  );

  // Status counts
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage reorder requests and track deliveries.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Status summaries */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            className={`p-3 rounded-lg text-center transition-colors cursor-pointer ${
              statusFilter === key ? 'ring-2 ring-primary' : ''
            } ${cfg.class}`}
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
          >
            <p className="text-xl font-bold">{statusCounts[key] || 0}</p>
            <p className="text-xs capitalize">{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {statusFilter && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('')}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Orders Table */}
      {filteredOrders.length > 0 ? (
        <div className="card-dashboard overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Vendor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Qty</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Value</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">AI</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm">{order.productName}</div>
                        <div className="text-xs text-muted-foreground">{order.productSku}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{order.vendorName || '—'}</td>
                      <td className="py-3 px-4 text-sm font-medium">{order.quantity}</td>
                      <td className="py-3 px-4 text-sm font-medium">
                        ${order.totalValue?.toLocaleString() || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {order.aiRecommendation ? (
                          <div>
                            <div className="flex items-center gap-1 text-xs text-primary">
                              <Brain className="h-3.5 w-3.5" />
                              {(order.aiRecommendation.confidence * 100).toFixed(0)}%
                              {order.aiRecommendation.llmContext?.contextBoostApplied && (
                                <Sparkles className="h-3 w-3 text-primary" title="Health context boost applied" />
                              )}
                            </div>
                            {order.aiRecommendation.llmContext?.contextBoostApplied && (
                              <p className="text-[10px] text-primary/70 mt-0.5 max-w-[180px] truncate" title={order.aiRecommendation.llmContext.reason}>
                                {order.aiRecommendation.llmContext.reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.class}`}>
                          {cfg.label}
                        </span>
                        {(order.status === 'VENDOR_REJECTED' || order.status === 'REJECTED') && order.rejectionReason && (
                          <p className="text-xs text-destructive/80 mt-1 max-w-[200px] truncate" title={order.rejectionReason}>
                            Reason: {order.rejectionReason}
                          </p>
                        )}
                        {order.status === 'DELAY_REQUESTED' && order.delayReason && (
                          <p className="text-xs text-orange-600 mt-1 max-w-[200px] truncate" title={order.delayReason}>
                            Reason: {order.delayReason}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No orders found</p>
          <p className="text-muted-foreground">
            {orders.length === 0
              ? 'Submit a reorder from AI Suggestions to create your first order.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-warning" /> Pending = awaiting owner</span>
        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> Approved = ready for vendor</span>
        <span className="flex items-center gap-1">Confirmed = vendor accepted</span>
        <span className="flex items-center gap-1">Dispatched = in transit</span>
        <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> Rejected</span>
        <span className="flex items-center gap-1"><Truck className="h-3 w-3 text-primary" /> Delivered</span>
      </div>
    </div>
  );
}
