import { InsightCard } from '@/components/dashboard/InsightCard';
import { mockAIInsights } from '@/data/mockData';
import { Brain, TrendingUp, AlertTriangle, Shield, Lightbulb } from 'lucide-react';

export default function AIInsights() {
  const warnings = mockAIInsights.filter(i => i.type === 'warning');
  const opportunities = mockAIInsights.filter(i => i.type === 'opportunity');
  const risks = mockAIInsights.filter(i => i.type === 'risk');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
        <p className="text-muted-foreground">Intelligent recommendations powered by machine learning.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{mockAIInsights.length}</p>
            <p className="text-sm text-muted-foreground">Total Insights</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{warnings.length}</p>
            <p className="text-sm text-muted-foreground">Warnings</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{opportunities.length}</p>
            <p className="text-sm text-muted-foreground">Opportunities</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-destructive/10">
            <Shield className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{risks.length}</p>
            <p className="text-sm text-muted-foreground">Risks</p>
          </div>
        </div>
      </div>

      {/* Demand Forecast Section */}
      <div className="card-dashboard">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-secondary/10">
            <Lightbulb className="h-5 w-5 text-secondary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Product Demand Forecast</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Current Stock</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">30-Day Forecast</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium">Paracetamol 500mg</td>
                <td className="py-3 px-4">45 units</td>
                <td className="py-3 px-4">+180 units needed</td>
                <td className="py-3 px-4"><span className="status-badge status-error">Urgent Reorder</span></td>
              </tr>
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium">Vitamin D3 1000IU</td>
                <td className="py-3 px-4">0 units</td>
                <td className="py-3 px-4">+120 units needed</td>
                <td className="py-3 px-4"><span className="status-badge status-error">Out of Stock</span></td>
              </tr>
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium">Cetirizine 10mg</td>
                <td className="py-3 px-4">300 units</td>
                <td className="py-3 px-4">85 units demand</td>
                <td className="py-3 px-4"><span className="status-badge status-warning">Overstock</span></td>
              </tr>
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium">Amoxicillin 250mg</td>
                <td className="py-3 px-4">200 units</td>
                <td className="py-3 px-4">150 units demand</td>
                <td className="py-3 px-4"><span className="status-badge status-success">Optimal</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* All Insights */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">All Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockAIInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  );
}
