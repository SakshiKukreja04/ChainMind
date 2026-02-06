import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Star, Clock, Package, Loader2, RefreshCw } from 'lucide-react';
import { vendorApi, type VendorResponse, type VendorPayload } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';

export default function Vendors() {
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { on } = useSocket();

  const [form, setForm] = useState<VendorPayload>({
    name: '',
    contact: '',
    leadTimeDays: 7,
    productsSupplied: [],
  });
  const [productsInput, setProductsInput] = useState('');

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

  // Real-time Socket.IO updates
  useEffect(() => {
    const unsub1 = on('vendor:approved', (data) => {
      const update = data as VendorResponse;
      setVendors((prev) =>
        prev.map((v) => (v.id === update.id ? { ...v, status: 'APPROVED', reliabilityScore: update.reliabilityScore ?? 100, isApproved: true } : v)),
      );
      toast({ title: 'Vendor Approved', description: `${update.name} has been approved` });
    });

    const unsub2 = on('vendor:rejected', (data) => {
      const update = data as VendorResponse;
      setVendors((prev) =>
        prev.map((v) => (v.id === update.id ? { ...v, status: 'REJECTED', isApproved: false } : v)),
      );
      toast({ title: 'Vendor Rejected', description: `${update.name} has been rejected`, variant: 'destructive' });
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [on, toast]);

  const filteredVendors = vendors.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contact.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSubmitVendor = async () => {
    if (!form.name || !form.contact) {
      toast({ title: 'Validation', description: 'Name and Contact are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const payload: VendorPayload = {
        ...form,
        productsSupplied: productsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await vendorApi.submitVendor(payload);
      setVendors((prev) => [res.vendor, ...prev]);
      toast({ title: 'Vendor submitted', description: `${res.vendor.name} — awaiting owner approval` });
      setAddOpen(false);
      setForm({ name: '', contact: '', leadTimeDays: 7, productsSupplied: [] });
      setProductsInput('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit vendor';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'status-success';
      case 'PENDING':
        return 'status-warning';
      case 'REJECTED':
        return 'status-error';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : `${vendors.length} vendors managed`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchVendors} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Vendor Request</DialogTitle>
                <DialogDescription>
                  This will be sent to the SME Owner for approval.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="v-name">Company Name *</Label>
                  <Input id="v-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ABC Pharma Suppliers" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="v-contact">Contact (Phone/Email) *</Label>
                  <Input id="v-contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="9876543210" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="v-lead">Lead Time (days)</Label>
                  <Input id="v-lead" type="number" min={1} value={form.leadTimeDays || 7} onChange={(e) => setForm({ ...form, leadTimeDays: parseInt(e.target.value) || 7 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="v-products">Products Supplied (comma-separated)</Label>
                  <Input id="v-products" value={productsInput} onChange={(e) => setProductsInput(e.target.value)} placeholder="Paracetamol, Ibuprofen, Aspirin" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmitVendor} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendor Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="card-dashboard">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {vendor.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                    <p className="text-sm text-muted-foreground">{vendor.contact}</p>
                  </div>
                </div>
                <span className={`status-badge ${statusBadge(vendor.status)}`}>
                  {vendor.status.toLowerCase()}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" />
                    <span className="text-sm text-muted-foreground">Reliability</span>
                  </div>
                  <span
                    className={`font-semibold ${
                      vendor.reliabilityScore >= 90
                        ? 'text-success'
                        : vendor.reliabilityScore >= 70
                        ? 'text-warning'
                        : 'text-destructive'
                    }`}
                  >
                    {vendor.reliabilityScore}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Lead Time</span>
                  </div>
                  <span className="font-semibold text-foreground">{vendor.leadTimeDays} days</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Products</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {vendor.productsSupplied?.length || 0}
                  </span>
                </div>

                {vendor.productsSupplied && vendor.productsSupplied.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {vendor.productsSupplied.slice(0, 3).map((p, i) => (
                      <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{p}</span>
                    ))}
                    {vendor.productsSupplied.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{vendor.productsSupplied.length - 3} more</span>
                    )}
                  </div>
                )}

                {vendor.submittedBy?.name && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Submitted by {vendor.submittedBy.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredVendors.length === 0 && (
        <div className="card-dashboard text-center py-12">
          <p className="text-lg font-medium text-foreground">No vendors found</p>
          <p className="text-muted-foreground">
            {vendors.length === 0 ? 'Submit your first vendor request to get started.' : 'Try adjusting your search or filter.'}
          </p>
        </div>
      )}
    </div>
  );
}
