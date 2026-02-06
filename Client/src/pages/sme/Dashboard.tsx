import { StatCard } from '@/components/dashboard/StatCard';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { dashboardStats, mockAIInsights } from '@/data/mockData';
import { 
  Package, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  ClipboardCheck,
  TrendingDown,
  Wallet
} from 'lucide-react';

export default function SMEDashboard() {
  const stats = dashboardStats.smeOwner;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your business at a glance.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          variant="primary"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Total Vendors"
          value={stats.totalVendors}
          icon={Users}
          variant="secondary"
        />
        <StatCard
          title="Stock at Risk"
          value={stats.stockAtRisk}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Today's Sales"
          value={`$${stats.todaysSales.toLocaleString()}`}
          icon={DollarSign}
          variant="success"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          icon={ClipboardCheck}
          variant="accent"
        />
      </div>

      {/* Business Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-dashboard">
          <h3 className="text-lg font-semibold text-foreground mb-6">Business Health</h3>
          <div className="flex justify-center">
            <HealthGauge value={stats.inventoryHealth} label="Inventory Health" />
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
              <span className="text-lg font-bold text-warning">${stats.overstockValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Package className="h-4 w-4 text-success" />
                </div>
                <span className="font-medium text-foreground">Required Stock</span>
              </div>
              <span className="text-lg font-bold text-success">${stats.requiredStock.toLocaleString()}</span>
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
            <p className="text-2xl font-bold text-foreground">${stats.cashTiedUp.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">AI Insights</h2>
          <a href="/sme/ai-insights" className="text-sm text-primary hover:underline">View all</a>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockAIInsights.slice(0, 4).map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  );
}
