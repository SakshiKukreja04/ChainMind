import { SalesChart } from '@/components/charts/SalesChart';
import { InventoryTurnoverChart } from '@/components/charts/InventoryTurnoverChart';
import { VendorComparisonChart } from '@/components/charts/VendorComparisonChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { TrendingUp, Package, RefreshCw, DollarSign } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Deep dive into your business performance metrics.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Revenue"
          value="$28,450"
          icon={DollarSign}
          variant="success"
          trend={{ value: 15, positive: true }}
        />
        <StatCard
          title="Avg. Order Value"
          value="$342"
          icon={TrendingUp}
          variant="primary"
          trend={{ value: 5, positive: true }}
        />
        <StatCard
          title="Inventory Turnover"
          value="6.2x"
          icon={RefreshCw}
          variant="secondary"
        />
        <StatCard
          title="Active Products"
          value="156"
          icon={Package}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <InventoryTurnoverChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VendorComparisonChart />
        
        {/* Forecast Accuracy */}
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-foreground mb-4">Forecast Accuracy</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-success/10 text-center">
              <p className="text-3xl font-bold text-success">92%</p>
              <p className="text-sm text-muted-foreground mt-1">Demand Forecast</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-3xl font-bold text-primary">88%</p>
              <p className="text-sm text-muted-foreground mt-1">Lead Time Estimate</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/10 text-center">
              <p className="text-3xl font-bold text-secondary">95%</p>
              <p className="text-sm text-muted-foreground mt-1">Stock Level Accuracy</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 text-center">
              <p className="text-3xl font-bold text-warning">85%</p>
              <p className="text-sm text-muted-foreground mt-1">Cost Predictions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
