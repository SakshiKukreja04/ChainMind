import { useState, useEffect, useCallback } from 'react';
import {
  suggestionApi,
  inventoryApi,
  orderApi,
  type AiSuggestionResponse,
  type ProductResponse,
  type OrderResponse,
} from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Package,
  Loader2,
  RefreshCw,
  Truck,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

export default function AIInsights() {
  const [suggestions, setSuggestions] = useState<AiSuggestionResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [dispatchedOrders, setDispatchedOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { on } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sugRes, prodRes, orderRes] = await Promise.all([
        suggestionApi.list(),
        inventoryApi.getProducts(),
        orderApi.list('DISPATCHED'),
      ]);
      setSuggestions(sugRes.suggestions);
      setProducts(prodRes.products);
      setDispatchedOrders(orderRes.orders);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    const unsub1 = on('ai:suggestion-created', () => fetchData());
    const unsub2 = on('order:dispatched', () => fetchData());
    const unsub3 = on('order:delivered', () => fetchData());
    const unsub4 = on('order:confirmed', () => fetchData());
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [on, fetchData]);

  const handleMarkReceived = async (orderId: string) => {
    setReceivingId(orderId);
    try {
      await orderApi.markReceived(orderId);
      toast({ title: 'Order Received', description: 'Stock updated & vendor score recalculated' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to mark received', variant: 'destructive' });
    } finally {
      setReceivingId(null);
    }
  };

  // Derive metrics
  const lowStockProducts = products.filter((p) => p.status === 'low-stock' || p.status === 'out-of-stock');
  const recentSuggestions = suggestions.slice(0, 10);

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
          <h1 className="text-2xl font-bold text-foreground">AI Insights & Order Tracking</h1>
          <p className="text-muted-foreground">Live AI recommendations and dispatched orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{suggestions.length}</p>
            <p className="text-sm text-muted-foreground">AI Suggestions</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{lowStockProducts.length}</p>
            <p className="text-sm text-muted-foreground">Low/Out of Stock</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10">
            <Truck className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{dispatchedOrders.length}</p>
            <p className="text-sm text-muted-foreground">Dispatched Orders</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-500/10">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{products.length}</p>
            <p className="text-sm text-muted-foreground">Total Products</p>
          </div>
        </div>
      </div>

      {/* Dispatched Orders — Mark as Received */}
      {dispatchedOrders.length > 0 && (
        <div className="card-dashboard">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-foreground">Dispatched Orders — Mark as Received</h2>
          </div>
          <div className="space-y-3">
            {dispatchedOrders.map((order) => (
              <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{order.productName}</span>
                    <Badge className="bg-purple-100 text-purple-800">DISPATCHED</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                    <span>Qty: {order.quantity}</span>
                    <span>•</span>
                    <span>Vendor: {order.vendorName}</span>
                    <span>•</span>
                    <span>${order.totalValue?.toLocaleString() ?? '—'}</span>
                    {order.dispatchedAt && (
                      <>
                        <span>•</span>
                        <span>Dispatched: {new Date(order.dispatchedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleMarkReceived(order.id)}
                  disabled={receivingId === order.id}
                >
                  {receivingId === order.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Mark Received
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Demand Forecast */}
      <div className="card-dashboard">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI Demand Forecast</h2>
        </div>
        {recentSuggestions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No AI suggestions yet. The manager can generate them from the AI Suggestions page.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Forecast Demand</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Recommended Qty</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Confidence</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Context</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSuggestions.map((s) => {
                  const product = products.find((p) => p.id === s.productId);
                  const conf = Math.round(s.confidence * 100);
                  return (
                    <tr key={s.id} className="table-row-hover border-b border-border/50">
                      <td className="py-3 px-4 font-medium">{s.productName}</td>
                      <td className="py-3 px-4">{s.predictedDailyDemand} units/day</td>
                      <td className="py-3 px-4 font-semibold">{s.suggestedReorderQty} units</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            conf >= 80
                              ? 'bg-green-100 text-green-800'
                              : conf >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {conf}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {s.llmContext?.contextBoostApplied ? (
                          <div className="flex items-start gap-1.5 max-w-[220px]">
                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="text-xs text-primary leading-tight">
                              {s.llmContext.reason}
                              <span className="text-muted-foreground ml-1">
                                (+{((s.llmContext.boostMultiplier) * 100).toFixed(0)}%)
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {product ? (
                          <Badge
                            className={
                              product.status === 'out-of-stock'
                                ? 'bg-red-100 text-red-800'
                                : product.status === 'low-stock'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                            }
                          >
                            {product.status.replace('-', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="card-dashboard">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-foreground">Stock Alerts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Stock: {p.currentStock} / Min: {p.minThreshold}
                  </p>
                </div>
                <Badge
                  className={
                    p.status === 'out-of-stock' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }
                >
                  {p.status.replace('-', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
