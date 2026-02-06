import { useState, useEffect, useCallback } from 'react';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { orderApi, type VendorPerformanceResponse } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { Award, TrendingUp, Clock, ThumbsUp, AlertTriangle, Loader2, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Performance() {
  const [data, setData] = useState<VendorPerformanceResponse['vendor'] | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { on } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderApi.vendorPerformance();
      setData(res.vendor);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to load performance', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const u1 = on('vendor:score-updated', () => fetchData());
    const u2 = on('vendor:performance-update', () => fetchData());
    const u3 = on('order:delivered', () => fetchData());
    return () => { u1(); u2(); u3(); };
  }, [on, fetchData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pm = data.performanceMetrics;
  const metrics = [
    { label: 'On-Time Delivery', value: pm.onTimeDeliveryRate ?? 0, icon: Clock },
    { label: 'Quality Score', value: pm.qualityScore ?? 50, icon: ThumbsUp },
    { label: 'Response Rate', value: pm.responseFintRate ?? 50, icon: TrendingUp },
  ];

  const scoreLabel =
    data.reliabilityScore >= 80 ? 'Excellent' :
    data.reliabilityScore >= 60 ? 'Good' :
    data.reliabilityScore >= 40 ? 'Fair' : 'Needs Improvement';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Score</h1>
          <p className="text-muted-foreground">Your reliability metrics — updated in real time.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Main Score */}
      <div className="card-dashboard">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <HealthGauge value={data.reliabilityScore} label="Reliability Score" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{scoreLabel} Performance</h2>
                <p className="text-muted-foreground">Total orders completed: {data.totalOrders}</p>
              </div>
            </div>
            {data.reliabilityScore >= 80 && (
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm text-success font-medium">
                  ✓ Your high reliability score qualifies you for priority order placements
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Breakdown */}
      <div className="card-dashboard">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" /> Order Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Approved', count: data.orderBreakdown.approved, color: 'text-blue-600' },
            { label: 'Confirmed', count: data.orderBreakdown.confirmed, color: 'text-amber-600' },
            { label: 'Dispatched', count: data.orderBreakdown.dispatched, color: 'text-purple-600' },
            { label: 'In Transit', count: data.orderBreakdown.inTransit, color: 'text-indigo-600' },
            { label: 'Delivered', count: data.orderBreakdown.delivered, color: 'text-green-600' },
            { label: 'Rejected', count: data.orderBreakdown.rejected, color: 'text-red-600' },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
              <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="card-dashboard">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <metric.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{metric.label}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${
                metric.value >= 80 ? 'text-success' :
                metric.value >= 60 ? 'text-warning' :
                'text-destructive'
              }`}>
                {metric.value}%
              </span>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  metric.value >= 80 ? 'bg-success' :
                  metric.value >= 60 ? 'bg-warning' :
                  'bg-destructive'
                }`}
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="card-dashboard">
        <h3 className="text-lg font-semibold text-foreground mb-4">Tips to Improve</h3>
        <div className="space-y-3">
          {[
            'Confirm orders within 2 hours for a better response rate.',
            'Dispatch on time to improve on-time delivery metrics.',
            'Avoid rejecting orders to maintain a high reliability score.',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{i + 1}</span>
              </div>
              <p className="text-sm text-muted-foreground">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
