import { InsightCard } from '@/components/dashboard/InsightCard';
import { mockAIInsights } from '@/data/mockData';
import { Brain, Lightbulb, TrendingUp } from 'lucide-react';

export default function AISuggestions() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Suggestions</h1>
        <p className="text-muted-foreground">Smart recommendations to optimize your inventory.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{mockAIInsights.length}</p>
            <p className="text-sm text-muted-foreground">Active Suggestions</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">$2,450</p>
            <p className="text-sm text-muted-foreground">Potential Savings</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Lightbulb className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">4</p>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">All Suggestions</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockAIInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  );
}
