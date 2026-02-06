import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/5 border-primary/20',
  secondary: 'bg-secondary/5 border-secondary/20',
  accent: 'bg-accent/5 border-accent/20',
  success: 'bg-success/5 border-success/20',
  warning: 'bg-warning/5 border-warning/20',
  destructive: 'bg-destructive/5 border-destructive/20',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  variant = 'default',
  className 
}: StatCardProps) {
  return (
    <div className={cn("stat-card", variantStyles[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={cn(
              "mt-1 text-sm font-medium flex items-center gap-1",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs last month</span>
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
