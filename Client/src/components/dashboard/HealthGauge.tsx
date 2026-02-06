import { cn } from '@/lib/utils';

interface HealthGaugeProps {
  value: number;
  label: string;
  className?: string;
}

export function HealthGauge({ value, label, className }: HealthGaugeProps) {
  const getColor = (val: number) => {
    if (val >= 80) return 'text-success';
    if (val >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getTrackColor = (val: number) => {
    if (val >= 80) return 'stroke-success';
    if (val >= 60) return 'stroke-warning';
    return 'stroke-destructive';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          {/* Progress track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-700 ease-out", getTrackColor(value))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", getColor(value))}>{value}%</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
