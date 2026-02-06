import { useState } from 'react';
import { ApprovalCard } from '@/components/dashboard/ApprovalCard';
import { mockApprovals } from '@/data/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import type { Approval } from '@/types';

export default function Approvals() {
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals);

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const approvedItems = approvals.filter(a => a.status === 'approved');
  const rejectedItems = approvals.filter(a => a.status === 'rejected');

  const handleApprove = (id: string) => {
    setApprovals(prev => 
      prev.map(a => a.id === id ? { ...a, status: 'approved' } : a)
    );
  };

  const handleReject = (id: string) => {
    setApprovals(prev => 
      prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a)
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
        <p className="text-muted-foreground">Review and manage pending approval requests.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pendingApprovals.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{approvedItems.length}</p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-destructive/10">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{rejectedItems.length}</p>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved ({approvedItems.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({rejectedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingApprovals.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingApprovals.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          ) : (
            <div className="card-dashboard text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">All caught up!</p>
              <p className="text-muted-foreground">No pending approvals at the moment.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedItems.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {approvedItems.map((approval) => (
                <div key={approval.id} className="card-dashboard opacity-75">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-success/10">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{approval.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{approval.description}</p>
                      <p className="text-sm text-success font-medium mt-2">Approved</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-dashboard text-center py-12">
              <p className="text-muted-foreground">No approved items yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedItems.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {rejectedItems.map((approval) => (
                <div key={approval.id} className="card-dashboard opacity-75">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-destructive/10">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{approval.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{approval.description}</p>
                      <p className="text-sm text-destructive font-medium mt-2">Rejected</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-dashboard text-center py-12">
              <p className="text-muted-foreground">No rejected items.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
