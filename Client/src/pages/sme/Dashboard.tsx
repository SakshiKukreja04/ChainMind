import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ownerApi,
  orderApi,
  suggestionApi,
  type OwnerSummaryResponse,
  type OrderResponse,
  type AiSuggestionResponse,
} from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Users,
  AlertTriangle,
  ClipboardCheck,
  TrendingDown,
  Wallet,
  Brain,
  Truck,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'C$', AUD: 'A$',
};

function fmt(value: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${sym}${value.toLocaleString()}`;
}

export default function SMEDashboard() {
  const [summary, setSummary] = useState<OwnerSummaryResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { on } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, orderRes, sugRes] = await Promise.all([
        ownerApi.summary(),
        orderApi.list(),
        suggestionApi.list(),
      ]);
      setSummary(summaryRes);
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

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const s = summary.summary;
  const currency = summary.currency;

  // Order pipeline counts from live orders
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;
  const approvedOrders = orders.filter((o) => o.status === 'APPROVED').length;
  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED');
  const dispatchedOrders = orders.filter((o) => o.status === 'DISPATCHED' || o.status === 'IN_TRANSIT');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;

  // Health score from summary
  const inStockPct = s.totalProducts > 0
    ? Math.round(((s.totalProducts - s.stockAtRisk - s.outOfStock) / s.totalProducts) * 100)
    : 0;

  const requiredStockValue = s.lowStockProducts.reduce((acc: number, p: any) => acc + p.restockValue, 0);

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
        <StatCard title="Total Products" value={s.totalProducts} icon={Package} variant="primary" />
        <StatCard title="Approved Vendors" value={s.vendors.approved} icon={Users} variant="secondary" />
        <StatCard title="Stock at Risk" value={s.stockAtRisk} icon={AlertTriangle} variant="warning" />
        <StatCard title="Awaiting Receipt" value={s.awaitingReceipt} icon={Truck} variant="accent" />
        <StatCard title="Pending Approvals" value={s.pendingApprovals} icon={ClipboardCheck} variant="success" />
      </div>

      {/* Business Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-dashboard">
          <h3 className="text-lg font-semibold text-foreground mb-6">Business Health</h3>
          <div className="flex justify-center">
            <HealthGauge value={inStockPct} label="Inventory Health" />
          </div>
          <div className="text-center mt-2">
            <span className="text-sm text-muted-foreground">Fulfillment Rate: <strong>{s.fulfillmentRate}%</strong></span>
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
                <span className="font-medium text-foreground">Restock Needed</span>
              </div>
              <span className="text-lg font-bold text-warning">{fmt(requiredStockValue, currency)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <span className="font-medium text-foreground">Out of Stock</span>
              </div>
              <span className="text-lg font-bold text-destructive">{s.outOfStock} items</span>
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
            <p className="text-2xl font-bold text-foreground">{fmt(s.totalInventoryValue, currency)}</p>
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
            <p className="text-2xl font-bold text-blue-600">{approvedOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">Approved</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
            <p className="text-2xl font-bold text-orange-600">{confirmedOrders.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
            <p className="text-2xl font-bold text-purple-600">{dispatchedOrders.length}</p>
            <p className="text-xs text-muted-foreground mt-1">In Transit</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
            <p className="text-2xl font-bold text-green-600">{deliveredOrders}</p>
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
              {suggestions.slice(0, 4).map((sg) => {
                const conf = Math.round(sg.confidence * 100);
                return (
                  <div key={sg.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">{sg.productName}</p>
                        {sg.llmContext?.contextBoostApplied && (
                          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" title="LLM context boost applied" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Demand: {sg.predictedDailyDemand}/day • Reorder: {sg.suggestedReorderQty} units
                      </p>
                      {sg.llmContext?.contextBoostApplied && (
                        <p className="text-xs text-primary mt-0.5 truncate" title={sg.llmContext.reason}>
                          ⚡ {sg.llmContext.reason}
                        </p>
                      )}
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
              <h3 className="text-lg font-semibold text-foreground">Awaiting Receipt ({s.awaitingReceipt})</h3>
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
                  <Badge className="bg-purple-100 text-purple-800">
                    {o.status === 'IN_TRANSIT' ? 'In Transit' : 'Dispatched'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
