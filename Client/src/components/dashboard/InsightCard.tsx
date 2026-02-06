import { cn } from '@/lib/utils';
import { AlertTriangle, TrendingUp, Shield, LucideIcon } from 'lucide-react';
import type { AIInsight } from '@/types';

interface InsightCardProps {
  insight: AIInsight;
  className?: string;
}

const typeConfig: Record<AIInsight['type'], { icon: LucideIcon; styles: string }> = {
  warning: { icon: AlertTriangle, styles: 'border-l-warning bg-warning/5' },
  opportunity: { icon: TrendingUp, styles: 'border-l-success bg-success/5' },
  risk: { icon: Shield, styles: 'border-l-destructive bg-destructive/5' },
};

const priorityBadge: Record<AIInsight['priority'], string> = {
  high: 'status-badge status-error',
  medium: 'status-badge status-warning',
  low: 'status-badge status-info',
};

export function InsightCard({ insight, className }: InsightCardProps) {
  const config = typeConfig[insight.type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "card-dashboard border-l-4",
      config.styles,
      className
    )}>
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <Icon className={cn(
            "h-5 w-5",
            insight.type === 'warning' && "text-warning",
            insight.type === 'opportunity' && "text-success",
            insight.type === 'risk' && "text-destructive"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-foreground truncate">{insight.title}</h4>
            <span className={priorityBadge[insight.priority]}>
              {insight.priority}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
          <p className="text-sm font-medium text-foreground">{insight.impact}</p>
        </div>
      </div>
    </div>
  );
}
