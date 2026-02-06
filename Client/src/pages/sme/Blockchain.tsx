import { mockBlockchainRecords } from '@/data/mockData';
import { Shield, CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react';

export default function BlockchainAudit() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Blockchain Audit</h1>
        <p className="text-muted-foreground">Immutable transaction records for supply chain transparency.</p>
      </div>

      {/* Trust Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <Shield className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{mockBlockchainRecords.filter(r => r.status === 'verified').length}</p>
            <p className="text-sm text-muted-foreground">Verified Records</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{mockBlockchainRecords.filter(r => r.status === 'pending').length}</p>
            <p className="text-sm text-muted-foreground">Pending Verification</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <ExternalLink className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{mockBlockchainRecords.length}</p>
            <p className="text-sm text-muted-foreground">Total Transactions</p>
          </div>
        </div>
      </div>

      {/* Blockchain Records Table */}
      <div className="card-dashboard">
        <h2 className="text-lg font-semibold text-foreground mb-4">Transaction Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Transaction Hash</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockBlockchainRecords.map((record) => (
                <tr key={record.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm font-medium text-primary">{record.orderId}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                        {record.hash}
                      </span>
                      <button className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{record.timestamp}</td>
                  <td className="py-3 px-4 text-sm font-medium text-foreground">{record.action}</td>
                  <td className="py-3 px-4">
                    {record.status === 'verified' && (
                      <span className="status-badge status-success inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </span>
                    )}
                    {record.status === 'pending' && (
                      <span className="status-badge status-warning inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                    {record.status === 'failed' && (
                      <span className="status-badge status-error inline-flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Info */}
      <div className="card-dashboard bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">Blockchain-Verified Supply Chain</h3>
            <p className="text-sm text-muted-foreground">
              Every order, delivery, and transaction is recorded on an immutable blockchain ledger. 
              This ensures complete transparency and trust between you and your vendors. 
              Each record is timestamped and cryptographically secured, providing an audit trail 
              that cannot be altered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
