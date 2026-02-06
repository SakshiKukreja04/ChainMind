import { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auditApi, type AuditLogEntry } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function VendorBlockchain() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await auditApi.list({ limit: 50 });
      setLogs(res.logs);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to load audit logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleVerify = async (orderId: string) => {
    try {
      setVerifying(orderId);
      const res = await auditApi.verifyOrder(orderId);
      toast({
        title: res.chainValid ? 'Chain Verified' : 'Verification Failed',
        description: res.chainValid
          ? `All ${res.entries.length} entries are valid.`
          : 'Hash chain integrity mismatch detected.',
        variant: res.chainValid ? 'default' : 'destructive',
      });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Verification failed', variant: 'destructive' });
    } finally {
      setVerifying(null);
    }
  };

  const verified = logs.filter(l => l.status === 'VERIFIED').length;
  const pending = logs.filter(l => l.status === 'PENDING').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blockchain Log</h1>
          <p className="text-muted-foreground">Your verified transaction history.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <Shield className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{verified}</p>
            <p className="text-sm text-muted-foreground">Verified Transactions</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pending}</p>
            <p className="text-sm text-muted-foreground">Pending Verification</p>
          </div>
        </div>
      </div>

      {/* Records */}
      {loading ? (
        <div className="card-dashboard flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="card-dashboard">
          <h2 className="text-lg font-semibold text-foreground mb-4">Transaction History</h2>
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No audit records yet.</p>
          ) : (
            <div className="space-y-4">
              {logs.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      record.status === 'VERIFIED' ? 'bg-success/10' : 'bg-warning/10'
                    }`}>
                      {record.status === 'VERIFIED' ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Clock className="h-5 w-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-primary">
                          {String(record.orderId).slice(-8)}
                        </span>
                        <span className={`status-badge ${
                          record.status === 'VERIFIED' ? 'status-success' : 'status-warning'
                        }`}>
                          {record.status === 'VERIFIED' ? 'verified' : 'pending'}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1">
                        {record.action.replace('ORDER_', '').replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(record.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-muted-foreground hidden md:block truncate max-w-[200px]">
                      {record.dataHash}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={verifying === record.orderId}
                      onClick={() => handleVerify(String(record.orderId))}
                      title="Verify chain"
                    >
                      {verifying === record.orderId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="card-dashboard bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">Cryptographic Verification</h3>
            <p className="text-sm text-muted-foreground">
              Each transaction is recorded with a SHA-256 hash chained to the previous entry,
              creating a tamper-evident audit trail. Click the shield icon to verify
              the full hash chain for any order.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
