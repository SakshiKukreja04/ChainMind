import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { TrendingUp, Package, RefreshCw, DollarSign, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ownerApi, type OwnerAnalyticsResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'C$', AUD: 'A$',
};
function fmt(value: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${sym}${value.toLocaleString()}`;
}
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['hsl(224 76% 48%)', 'hsl(170 82% 42%)', 'hsl(38 92% 50%)', 'hsl(0 84% 60%)', 'hsl(280 68% 50%)', 'hsl(200 80% 50%)'];

export default function Analytics() {
  const [data, setData] = useState<OwnerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ownerApi.analytics(12);
      setData(res);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to load analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { analytics, currency } = data;
  const t = analytics.totals;

  const salesChartData = analytics.monthlySales.map((m) => ({
    month: `${MONTH_NAMES[m.month - 1]} ${m.year}`,
    revenue: m.totalRevenue,
    orders: m.orderCount,
  }));

  const fulfillmentChartData = analytics.fulfillmentTrend.map((m) => ({
    month: `${MONTH_NAMES[m.month - 1]}`,
    delivered: m.delivered,
    rejected: m.rejected,
    rate: m.fulfillmentRate,
  }));

  const inventoryPieData = analytics.inventoryValuation.map((c) => ({
    name: c.category,
    value: c.totalCostValue,
    sellingValue: c.totalSellingValue,
    products: c.productCount,
  }));

  const vendorData = analytics.vendorReliability.slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Deep dive into your business performance metrics.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={fmt(t.totalSalesRevenue, currency)} icon={DollarSign} variant="success" />
        <StatCard title="Total Orders" value={t.totalSalesOrders} icon={TrendingUp} variant="primary" />
        <StatCard title="Inventory Value" value={fmt(t.totalInventoryCostValue, currency)} icon={Package} variant="secondary" />
        <StatCard title="Avg Vendor Score" value={`${t.avgVendorReliability}%`} icon={Users} variant="accent" />
      </div>

      {/* Sales Trend + Fulfillment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Sales Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(224 76% 48%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(224 76% 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}
                  tickFormatter={(v) => fmt(v, currency).replace(/,/g, '')} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [fmt(value, currency), '']} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(224 76% 48%)" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container">
          <h3 className="text-lg font-semibold text-foreground mb-4">Fulfillment Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fulfillmentChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="delivered" name="Delivered" fill="hsl(170 82% 42%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Inventory Valuation + Vendor Reliability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-foreground mb-4">Inventory by Category</h3>
          {inventoryPieData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No inventory data available.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={inventoryPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {inventoryPieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => [fmt(value, currency), 'Cost Value']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="chart-container">
          <h3 className="text-lg font-semibold text-foreground mb-4">Vendor Reliability</h3>
          {vendorData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No vendor data available.</p>
          ) : (
            <div className="space-y-3">
              {vendorData.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{v.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.totalOrders} orders &bull; {v.leadTimeDays}d avg lead &bull; {v.onTimeDeliveryRate}% on-time
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${v.reliabilityScore >= 80 ? 'text-green-600' : v.reliabilityScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {v.reliabilityScore}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
