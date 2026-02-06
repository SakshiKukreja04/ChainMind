import { mockBlockchainRecords } from '@/data/mockData';
import { Shield, CheckCircle2, Clock, ExternalLink } from 'lucide-react';

export default function VendorBlockchain() {
  const vendorRecords = mockBlockchainRecords.slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Blockchain Log</h1>
        <p className="text-muted-foreground">Your verified transaction history.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <Shield className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {vendorRecords.filter(r => r.status === 'verified').length}
            </p>
            <p className="text-sm text-muted-foreground">Verified Transactions</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {vendorRecords.filter(r => r.status === 'pending').length}
            </p>
            <p className="text-sm text-muted-foreground">Pending Verification</p>
          </div>
        </div>
      </div>

      {/* Records */}
      <div className="card-dashboard">
        <h2 className="text-lg font-semibold text-foreground mb-4">Transaction History</h2>
        <div className="space-y-4">
          {vendorRecords.map((record) => (
            <div 
              key={record.id} 
              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  record.status === 'verified' ? 'bg-success/10' : 'bg-warning/10'
                }`}>
                  {record.status === 'verified' ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Clock className="h-5 w-5 text-warning" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-primary">{record.orderId}</span>
                    <span className={`status-badge ${
                      record.status === 'verified' ? 'status-success' : 'status-warning'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{record.action}</p>
                  <p className="text-xs text-muted-foreground mt-1">{record.timestamp}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-muted-foreground hidden md:block truncate max-w-[200px]">
                  {record.hash}
                </code>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="card-dashboard bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">What is Blockchain Verification?</h3>
            <p className="text-sm text-muted-foreground">
              Each transaction is recorded on an immutable ledger, creating a permanent audit trail.
              This builds trust with your business partners by providing transparent, 
              tamper-proof records of all order activities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
