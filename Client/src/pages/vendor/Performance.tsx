import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { dashboardStats } from '@/data/mockData';
import { Award, TrendingUp, Clock, ThumbsUp, AlertTriangle } from 'lucide-react';

export default function Performance() {
  const score = dashboardStats.vendor.performanceScore;

  const metrics = [
    { label: 'On-Time Delivery', value: 94, icon: Clock },
    { label: 'Order Accuracy', value: 98, icon: ThumbsUp },
    { label: 'Response Rate', value: 89, icon: TrendingUp },
    { label: 'Issue Resolution', value: 91, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Performance Score</h1>
        <p className="text-muted-foreground">Your reliability metrics as a vendor.</p>
      </div>

      {/* Main Score */}
      <div className="card-dashboard">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <HealthGauge value={score} label="Overall Score" />
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Excellent Performance</h2>
                <p className="text-muted-foreground">You're among the top 10% of vendors</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm text-success font-medium">
                ✓ Your high reliability score qualifies you for priority order placements
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                metric.value >= 90 ? 'text-success' :
                metric.value >= 80 ? 'text-warning' :
                'text-destructive'
              }`}>
                {metric.value}%
              </span>
              <span className="text-sm text-muted-foreground mb-1">score</span>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  metric.value >= 90 ? 'bg-success' :
                  metric.value >= 80 ? 'bg-warning' :
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
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Improve response rate by replying to order confirmations within 2 hours
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Maintain consistent lead times by updating delivery estimates promptly
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Keep your product catalog updated to avoid order discrepancies
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
