import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  inventoryApi,
  vendorApi,
  orderApi,
  suggestionApi,
  alertApi,
  type ProductResponse,
  type VendorResponse,
  type OrderResponse,
  type AiSuggestionResponse,
} from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  ClipboardCheck,
  TrendingDown,
  Wallet,
  Brain,
  Truck,
  ShoppingCart,
  Loader2,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SMEDashboard() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { on } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, vendorRes, orderRes, sugRes] = await Promise.all([
        inventoryApi.getProducts(),
        vendorApi.getVendors(),
        orderApi.list(),
        suggestionApi.list(),
      ]);
      setProducts(prodRes.products);
      setVendors(vendorRes.vendors);
      setOrders(orderRes.orders);
      setSuggestions(sugRes.suggestions);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to load dashboard data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    const u1 = on('inventory:product-added', () => fetchData());
    const u2 = on('inventory:stock-updated', () => fetchData());
    const u3 = on('vendor:pending-approval', () => fetchData());
    const u4 = on('vendor:approved', () => fetchData());
    const u5 = on('order:pending-approval', () => fetchData());
    const u6 = on('order:approved', () => fetchData());
    const u7 = on('order:confirmed', () => fetchData());
    const u8 = on('order:dispatched', () => fetchData());
    const u9 = on('order:delivered', () => fetchData());
    const u10 = on('ai:suggestion-created', () => fetchData());
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); u9(); u10(); };
  }, [on, fetchData]);

  // Derived stats from live data
  const totalProducts = products.length;
  const totalVendors = vendors.filter((v) => v.status === 'APPROVED').length;
  const stockAtRisk = products.filter((p) => p.status === 'low-stock' || p.status === 'out-of-stock').length;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;
  const pendingVendors = vendors.filter((v) => v.status === 'PENDING').length;
  const totalPendingApprovals = pendingOrders + pendingVendors;
  const dispatchedOrders = orders.filter((o) => o.status === 'DISPATCHED');
  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  // Inventory value calculations
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.costPrice * p.currentStock), 0);
  const overstockValue = products
    .filter((p) => p.currentStock > p.minThreshold * 3)
    .reduce((acc, p) => acc + (p.costPrice * (p.currentStock - p.minThreshold)), 0);
  const requiredStockValue = products
    .filter((p) => p.status === 'low-stock' || p.status === 'out-of-stock')
    .reduce((acc, p) => acc + (p.costPrice * Math.max(0, p.minThreshold - p.currentStock)), 0);

  // Health score: % of products in-stock
  const inStockPct = totalProducts > 0
    ? Math.round((products.filter((p) => p.status === 'in-stock').length / totalProducts) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your business at a glance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          variant="primary"
        />
        <StatCard
          title="Approved Vendors"
          value={totalVendors}
          icon={Users}
          variant="secondary"
        />
        <StatCard
          title="Stock at Risk"
          value={stockAtRisk}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Total Orders"
          value={orders.length}
          icon={ShoppingCart}
          variant="success"
        />
        <StatCard
          title="Pending Approvals"
          value={totalPendingApprovals}
          icon={ClipboardCheck}
          variant="accent"
        />
      </div>

      {/* Business Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-dashboard">
          <h3 className="text-lg font-semibold text-foreground mb-6">Business Health</h3>
          <div className="flex justify-center">
            <HealthGauge value={inStockPct} label="Inventory Health" />
          </div>
        </div>

        <div className="card-dashboard">
          <h3 className="text-lg font-semibold text-foreground mb-4">Stock Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <TrendingDown className="h-4 w-4 text-warning" />
                </div>
                <span className="font-medium text-foreground">Overstock Value</span>
              </div>
              <span className="text-lg font-bold text-warning">${overstockValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Package className="h-4 w-4 text-success" />
                </div>
                <span className="font-medium text-foreground">Restock Needed</span>
              </div>
              <span className="text-lg font-bold text-success">${requiredStockValue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="card-dashboard">
          <h3 className="text-lg font-semibold text-foreground mb-4">Cash Flow</h3>
          <div className="flex flex-col items-center justify-center h-32">
            <div className="p-3 rounded-xl bg-primary/10 mb-3">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Cash Tied in Inventory</p>
            <p className="text-2xl font-bold text-foreground">${totalInventoryValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Order Pipeline */}
      <div className="card-dashboard">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Order Pipeline</h3>
          <Link to="/sme/approvals" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <p className="text-2xl font-bold text-amber-600">{pendingOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending Approval</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <p className="text-2xl font-bold text-blue-600">{orders.filter((o) => o.status === 'APPROVED').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Approved</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
            <p className="text-2xl font-bold text-orange-600">{confirmedOrders.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
            <p className="text-2xl font-bold text-purple-600">{dispatchedOrders.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Dispatched</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
            <p className="text-2xl font-bold text-green-600">{deliveredOrders.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Delivered</p>
          </div>
        </div>
      </div>

      {/* AI Insights + Recent Orders side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights Preview */}
        <div className="card-dashboard">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">AI Insights</h3>
            </div>
            <Link to="/sme/ai-insights" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No AI suggestions yet. Manager can generate them from AI Suggestions.
            </p>
          ) : (
            <div className="space-y-3">
              {suggestions.slice(0, 4).map((s) => {
                const conf = Math.round(s.confidence * 100);
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        Demand: {s.predictedDailyDemand}/day • Reorder: {s.suggestedReorderQty} units
                      </p>
                    </div>
                    <Badge className={
                      conf >= 80 ? 'bg-green-100 text-green-800' :
                      conf >= 50 ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {conf}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dispatched orders needing receipt */}
        <div className="card-dashboard">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-foreground">Awaiting Receipt</h3>
            </div>
            <Link to="/sme/approvals" className="text-sm text-primary hover:underline">Manage</Link>
          </div>
          {dispatchedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No dispatched orders awaiting receipt.
            </p>
          ) : (
            <div className="space-y-3">
              {dispatchedOrders.slice(0, 4).map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{o.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {o.quantity} • {o.vendorName}
                      {o.dispatchedAt && ` • ${new Date(o.dispatchedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">Dispatched</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
