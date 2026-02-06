import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, X, ShoppingCart, Users, Handshake } from 'lucide-react';
import type { Approval } from '@/types';

interface ApprovalCardProps {
  approval: Approval;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  className?: string;
}

const typeIcon = {
  'reorder': ShoppingCart,
  'vendor-onboarding': Users,
  'cooperative-buy': Handshake,
};

const riskStyles = {
  low: 'status-badge status-success',
  medium: 'status-badge status-warning',
  high: 'status-badge status-error',
};

export function ApprovalCard({ approval, onApprove, onReject, className }: ApprovalCardProps) {
  const Icon = typeIcon[approval.type];

  return (
    <div className={cn("card-dashboard", className)}>
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground">{approval.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{approval.description}</p>
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Cost Impact: </span>
              <span className={cn(
                "font-semibold",
                approval.costImpact < 0 ? "text-success" : "text-foreground"
              )}>
                {approval.costImpact < 0 ? '-' : ''}${Math.abs(approval.costImpact).toLocaleString()}
              </span>
            </div>
            <span className={riskStyles[approval.riskLevel]}>
              {approval.riskLevel} risk
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <span>Requested by {approval.requestedBy}</span>
            <span>•</span>
            <span>{approval.createdAt}</span>
          </div>

          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="success"
              onClick={() => onApprove?.(approval.id)}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onReject?.(approval.id)}
              className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
