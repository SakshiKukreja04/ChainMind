import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Package,
  Loader2,
  RefreshCw,
  User,
} from 'lucide-react';
import { vendorApi, type VendorResponse } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';

export default function Approvals() {
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { on } = useSocket();

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vendorApi.getVendors();
      setVendors(res.vendors);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load vendors';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Real-time: new vendor requests appear instantly
  useEffect(() => {
    const unsub = on('vendor:pending-approval', (data) => {
      const vendor = data as VendorResponse;
      setVendors((prev) => {
        const exists = prev.find((v) => v.id === vendor.id);
        return exists ? prev : [vendor, ...prev];
      });
      toast({ title: 'New Vendor Request', description: `${vendor.name} awaiting approval` });
    });
    return unsub;
  }, [on, toast]);

  const pendingVendors = vendors.filter((v) => v.status === 'PENDING');
  const approvedVendors = vendors.filter((v) => v.status === 'APPROVED');
  const rejectedVendors = vendors.filter((v) => v.status === 'REJECTED');

  const handleApprove = async (id: string) => {
    try {
      const res = await vendorApi.approveVendor(id);
      setVendors((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, status: 'APPROVED', reliabilityScore: res.vendor.reliabilityScore ?? 100, isApproved: true }
            : v,
        ),
      );
      toast({ title: 'Approved', description: `${res.vendor.name} is now an approved vendor` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await vendorApi.rejectVendor(id);
      setVendors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: 'REJECTED', isApproved: false } : v)),
      );
      toast({ title: 'Rejected', description: `${res.vendor.name} has been rejected` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Approvals</h1>
          <p className="text-muted-foreground">Review and manage vendor onboarding requests.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchVendors}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pendingVendors.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{approvedVendors.length}</p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-destructive/10">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{rejectedVendors.length}</p>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingVendors.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved ({approvedVendors.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({rejectedVendors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingVendors.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingVendors.map((vendor) => (
                <VendorApprovalCard
                  key={vendor.id}
                  vendor={vendor}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          ) : (
            <div className="card-dashboard text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">All caught up!</p>
              <p className="text-muted-foreground">No pending vendor requests at the moment.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedVendors.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {approvedVendors.map((vendor) => (
                <div key={vendor.id} className="card-dashboard">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-success/10">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{vendor.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{vendor.contact}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm flex items-center gap-1">
                          <Star className="h-3 w-3 text-warning" /> {vendor.reliabilityScore}%
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Lead: {vendor.leadTimeDays}d
                        </span>
                      </div>
                      <p className="text-sm text-success font-medium mt-2">Approved</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-dashboard text-center py-12">
              <p className="text-muted-foreground">No approved vendors yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedVendors.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {rejectedVendors.map((vendor) => (
                <div key={vendor.id} className="card-dashboard opacity-75">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-destructive/10">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{vendor.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{vendor.contact}</p>
                      <p className="text-sm text-destructive font-medium mt-2">Rejected</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-dashboard text-center py-12">
              <p className="text-muted-foreground">No rejected vendors.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Vendor approval card shown in the Pending tab */
function VendorApprovalCard({
  vendor,
  onApprove,
  onReject,
}: {
  vendor: VendorResponse;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [acting, setActing] = useState(false);

  const handle = async (action: 'approve' | 'reject') => {
    setActing(true);
    if (action === 'approve') await onApprove(vendor.id);
    else await onReject(vendor.id);
    setActing(false);
  };

  return (
    <div className="card-dashboard border-l-4 border-l-warning">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-primary">{vendor.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-lg">{vendor.name}</h4>
          <p className="text-sm text-muted-foreground">{vendor.contact}</p>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Lead:</span>
              <span className="font-medium">{vendor.leadTimeDays} days</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Products:</span>
              <span className="font-medium">{vendor.productsSupplied?.length || 0}</span>
            </div>
          </div>

          {vendor.productsSupplied && vendor.productsSupplied.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {vendor.productsSupplied.map((p, i) => (
                <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{p}</span>
              ))}
            </div>
          )}

          {vendor.submittedBy?.name && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              Submitted by {vendor.submittedBy.name}
            </div>
          )}

          <div className="flex gap-2 mt-4 pt-3 border-t border-border">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handle('approve')}
              disabled={acting}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => handle('reject')}
              disabled={acting}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
