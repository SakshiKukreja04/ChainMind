import { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle2, Clock, XCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auditApi, type AuditLogEntry } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function BlockchainAudit() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [filterOrderId, setFilterOrderId] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await auditApi.list({ limit: 100 });
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
      if (res.chainValid) {
        toast({ title: 'Chain Verified', description: `All ${res.entries.length} entries for this order are valid.` });
      } else {
        toast({ title: 'Verification Failed', description: 'Hash chain integrity mismatch detected.', variant: 'destructive' });
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Verification failed', variant: 'destructive' });
    } finally {
      setVerifying(null);
    }
  };

  const verified = logs.filter(l => l.status === 'VERIFIED').length;
  const pending = logs.filter(l => l.status === 'PENDING').length;

  const filtered = filterOrderId
    ? logs.filter(l => String(l.orderId).includes(filterOrderId))
    : logs;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blockchain Audit</h1>
          <p className="text-muted-foreground">Immutable, hash-chained transaction records for supply chain transparency.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Trust Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <Shield className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{verified}</p>
            <p className="text-sm text-muted-foreground">Verified Records</p>
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
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <ExternalLink className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{logs.length}</p>
            <p className="text-sm text-muted-foreground">Total Transactions</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="relative max-w-sm">
        <Input
          placeholder="Filter by Order ID…"
          value={filterOrderId}
          onChange={(e) => setFilterOrderId(e.target.value)}
        />
      </div>

      {/* Records Table */}
      {loading ? (
        <div className="card-dashboard flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="card-dashboard">
          <h2 className="text-lg font-semibold text-foreground mb-4">Transaction Records</h2>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No audit records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Transaction Hash</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Timestamp</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr key={record.id} className="table-row-hover border-b border-border last:border-0">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-primary">
                          {String(record.orderId).slice(-8)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                            {record.dataHash}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        {record.action.replace('ORDER_', '').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4">
                        {record.status === 'VERIFIED' ? (
                          <span className="status-badge status-success inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="status-badge status-warning inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Trust Info */}
      <div className="card-dashboard bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">Cryptographic Audit Trail</h3>
            <p className="text-sm text-muted-foreground">
              Every order lifecycle event is recorded with a SHA-256 hash chained to the
              previous entry, creating a tamper-evident audit trail. Click the shield icon
              on any row to verify the full hash chain for that order.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
