import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cooperativeApi, inventoryApi } from '@/lib/api';
import type { CooperativeBuy, Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, ArrowLeft, Users, Package, TrendingDown, CheckCircle,
  XCircle, ShoppingCart, Truck, BadgePercent, Clock, User, MapPin,
  AlertTriangle, Handshake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ─── Status config ────────────────────────────────────────────

const statusConfig: Record<CooperativeBuy['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  PROPOSED: { label: 'Proposed', variant: 'secondary', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'default', icon: CheckCircle },
  ORDERED: { label: 'Ordered', variant: 'default', icon: ShoppingCart },
  DELIVERED: { label: 'Delivered', variant: 'outline', icon: Truck },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

export default function CooperativeBuyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [coop, setCoop] = useState<CooperativeBuy | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Join dialog
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinProductId, setJoinProductId] = useState('');
  const [joinQty, setJoinQty] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  // Vendor select dialog
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorPricing, setVendorPricing] = useState<{
    unitPrice: number;
    bulkPrice: number;
    totalCost: number;
    totalSavings: number;
    savingsPercent: number;
    minOrderQty: number;
    leadTimeDays: number;
    vendorProductName: string | null;
    priceSource: 'catalog' | 'estimated';
  } | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────

  async function fetchDetail() {
    if (!id) return;
    setLoading(true);
    try {
      const [res, prodRes] = await Promise.all([
        cooperativeApi.get(id),
        inventoryApi.getProducts(),
      ]);
      if (res.success) setCoop(res.data);
      const prods = Array.isArray(prodRes) ? prodRes : (prodRes as any)?.data?.products ?? (prodRes as any)?.products ?? [];
      setProducts(prods);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDetail(); }, [id]);

  // Fetch vendor pricing when a vendor is selected in dialog
  useEffect(() => {
    if (!selectedVendorId || !id) {
      setVendorPricing(null);
      return;
    }
    let cancelled = false;
    setPricingLoading(true);
    cooperativeApi.getVendorPricing(id, selectedVendorId)
      .then((res) => {
        if (!cancelled && res.success) setVendorPricing(res.data);
      })
      .catch(() => {
        // Fall back to vendorSuggestions data
        if (!cancelled) {
          const vs = coop?.vendorSuggestions.find((v) => String(v.vendorId) === selectedVendorId);
          if (vs) {
            const totalQty = coop?.totalQuantity || 0;
            setVendorPricing({
              unitPrice: vs.unitPrice,
              bulkPrice: vs.bulkPrice,
              totalCost: vs.bulkPrice * totalQty,
              totalSavings: (vs.unitPrice - vs.bulkPrice) * totalQty,
              savingsPercent: vs.unitPrice > 0 ? Math.round(((vs.unitPrice - vs.bulkPrice) / vs.unitPrice) * 100) : 0,
              minOrderQty: vs.minOrderQty,
              leadTimeDays: vs.leadTimeDays,
              vendorProductName: null,
              priceSource: 'estimated',
            });
          }
        }
      })
      .finally(() => { if (!cancelled) setPricingLoading(false); });
    return () => { cancelled = true; };
  }, [selectedVendorId, id]);

  // ── Actions ────────────────────────────────────────────────

  async function handleApprove() {
    if (!id) return;
    setActionLoading('approve');
    try {
      const res = await cooperativeApi.approve(id);
      if (res.success) {
        toast({ title: 'Approved', description: 'Your participation is now approved.' });
        setCoop(res.data);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleJoin() {
    if (!id || !joinProductId || !joinQty) return;
    setActionLoading('join');
    try {
      const res = await cooperativeApi.join(id, {
        productId: joinProductId,
        requestedQty: Number(joinQty),
      });
      if (res.success) {
        toast({ title: 'Joined', description: 'You have joined this cooperative group!' });
        setJoinOpen(false);
        fetchDetail();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSelectVendor() {
    if (!id || !selectedVendorId) return;
    setActionLoading('vendor');
    try {
      const res = await cooperativeApi.selectVendor(id, selectedVendorId);
      if (res.success) {
        toast({ title: 'Vendor Selected', description: 'Bulk order has been placed!' });
        setVendorDialogOpen(false);
        setCoop(res.data);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (!id) return;
    setActionLoading('cancel');
    try {
      const res = await cooperativeApi.cancel(id);
      if (res.success) {
        toast({ title: 'Cancelled', description: 'Cooperative group has been cancelled.' });
        setCoop(res.data);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }

  // ── Derived state ──────────────────────────────────────────

  const isInitiator = coop && user && String(coop.initiatedBy?._id) === String((user as any).userId || (user as any).id);
  const isParticipant = coop?.participants.some(
    (p) => String(typeof p.businessId === 'object' ? p.businessId._id : p.businessId) === String((user as any).businessId),
  );
  const myParticipation = coop?.participants.find(
    (p) => String(typeof p.businessId === 'object' ? p.businessId._id : p.businessId) === String((user as any).businessId),
  );
  const allApproved = coop ? coop.participants.every((p) => p.approved) : false;
  const sc = coop ? statusConfig[coop.status] : null;

  // ── Loading ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!coop) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Cooperative group not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/sme/cooperative-buy')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Cooperative Buying
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sme/cooperative-buy')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground truncate">{coop.productName}</h1>
            {sc && <Badge variant={sc.variant}>{sc.label}</Badge>}
          </div>
          <p className="text-muted-foreground">{coop.category} — Co-Buy Group</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{coop.participants.length}</p>
            <p className="text-sm text-muted-foreground">Participants</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Package className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{coop.totalQuantity}</p>
            <p className="text-sm text-muted-foreground">Total Quantity</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <BadgePercent className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{coop.estimatedSavingsPercent}%</p>
            <p className="text-sm text-muted-foreground">Est. Savings</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-muted">
            <Handshake className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {coop.participants.filter((p) => p.approved).length}/{coop.participants.length}
            </p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-3">
        {/* Join button – not a participant & PROPOSED */}
        {!isParticipant && coop.status === 'PROPOSED' && (
          <Button onClick={() => setJoinOpen(true)} className="gap-2">
            <Users className="h-4 w-4" /> Join This Group
          </Button>
        )}

        {/* Approve button – participant, not yet approved, PROPOSED */}
        {isParticipant && myParticipation && !myParticipation.approved && coop.status === 'PROPOSED' && (
          <Button onClick={handleApprove} disabled={actionLoading === 'approve'} className="gap-2">
            {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Approve My Share
          </Button>
        )}

        {/* Select vendor – initiator, APPROVED */}
        {isInitiator && coop.status === 'APPROVED' && (
          <Button onClick={() => setVendorDialogOpen(true)} className="gap-2">
            <Truck className="h-4 w-4" /> Select Vendor & Order
          </Button>
        )}

        {/* Cancel – initiator, not DELIVERED/CANCELLED */}
        {isInitiator && !['DELIVERED', 'CANCELLED'].includes(coop.status) && (
          <Button variant="destructive" onClick={handleCancel} disabled={actionLoading === 'cancel'} className="gap-2">
            {actionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel Group
          </Button>
        )}
      </div>

      {/* Participants Table */}
      <div className="card-dashboard">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" /> Participants
          </h2>
        </div>
        <div className="divide-y divide-border">
          {coop.participants.map((p, idx) => {
            const biz = typeof p.businessId === 'object' ? p.businessId : null;
            const owner = typeof p.ownerId === 'object' ? p.ownerId : null;
            const prod = typeof p.productId === 'object' ? p.productId : null;
            const isMe = String(biz?._id) === String((user as any)?.businessId);

            return (
              <div
                key={idx}
                className={`p-4 flex items-center gap-4 ${isMe ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-sm font-semibold text-muted-foreground shrink-0">
                  {biz?.businessName?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {biz?.businessName || 'Unknown Business'}
                      {isMe && <span className="text-xs text-primary ml-1">(You)</span>}
                    </p>
                    {String(coop.initiatedBy?._id) === String(owner?._id) && (
                      <Badge variant="outline" className="text-xs">Initiator</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {owner?.name || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {biz?.location || 'Unknown'}
                    </span>
                    {prod && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> Stock: {prod.currentStock}/{prod.minThreshold}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-foreground">{p.requestedQty} units</p>
                  {p.approved ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <CheckCircle className="h-3 w-3" /> Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-warning">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vendor Suggestions */}
      {coop.vendorSuggestions.length > 0 && (
        <div className="card-dashboard">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5" /> Vendor Options
              {coop.selectedVendorId && (
                <Badge variant="default" className="ml-2">Vendor Selected</Badge>
              )}
            </h2>
          </div>
          <div className="divide-y divide-border">
            {coop.vendorSuggestions.map((vs, idx) => {
              const isSelected = coop.selectedVendorId &&
                String(typeof coop.selectedVendorId === 'object' ? coop.selectedVendorId._id : coop.selectedVendorId) === String(vs.vendorId);

              return (
                <div
                  key={idx}
                  className={`p-4 flex items-center gap-4 ${isSelected ? 'bg-success/5 ring-1 ring-success/20' : ''}`}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-sm font-semibold shrink-0">
                    {vs.vendorName?.charAt(0).toUpperCase() || 'V'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {vs.vendorName}
                      {isSelected && <Badge variant="default" className="ml-2 text-xs">Selected</Badge>}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>Unit: ${vs.unitPrice.toFixed(2)}</span>
                      <span className="text-success font-medium">Bulk: ${vs.bulkPrice.toFixed(2)}</span>
                      <span>Min Order: {vs.minOrderQty}</span>
                      <span>Lead: {vs.leadTimeDays}d</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-success flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5" />
                      Save ${((vs.unitPrice - vs.bulkPrice) * coop.totalQuantity).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: ${(vs.bulkPrice * coop.totalQuantity).toFixed(0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cooperative Info */}
      <div className="card-dashboard p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Initiated By</p>
            <p className="font-medium">
              {typeof coop.initiatedByBusiness === 'object' ? coop.initiatedByBusiness.businessName : 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">{new Date(coop.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Product Hash</p>
            <p className="font-mono text-xs truncate">{coop.productSpecHash}</p>
          </div>
          {coop.notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="font-medium">{coop.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Join Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Cooperative Group</DialogTitle>
            <DialogDescription>
              Select the matching product from your inventory and specify how many units you need.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Your Product</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={joinProductId}
                onChange={(e) => setJoinProductId(e.target.value)}
              >
                <option value="">Select a matching product...</option>
                {products
                  .filter((p) => p.category.toLowerCase() === coop.category.toLowerCase())
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Stock: {p.currentStock}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Quantity Needed</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 30"
                value={joinQty}
                onChange={(e) => setJoinQty(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button onClick={handleJoin} disabled={actionLoading === 'join'}>
              {actionLoading === 'join' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Join
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Selection Dialog */}
      <Dialog open={vendorDialogOpen} onOpenChange={(open) => { setVendorDialogOpen(open); if (!open) { setSelectedVendorId(''); setVendorPricing(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Vendor for Bulk Order</DialogTitle>
            <DialogDescription>
              Choose a vendor to place the combined order of {coop.totalQuantity} units.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
              >
                <option value="">Select a vendor...</option>
                {coop.vendorSuggestions.map((vs) => (
                  <option key={vs.vendorId} value={vs.vendorId}>
                    {vs.vendorName} — Lead: {vs.leadTimeDays}d
                  </option>
                ))}
              </select>
            </div>
            {selectedVendorId && (
              pricingLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading pricing...</span>
                </div>
              ) : vendorPricing ? (
                <div className="rounded-lg border p-4 bg-muted/50 text-sm space-y-2">
                  {vendorPricing.vendorProductName && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Matched catalog: <span className="font-medium text-foreground">{vendorPricing.vendorProductName}</span>
                    </p>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit price:</span>
                    <span className="font-medium">${vendorPricing.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bulk price ({vendorPricing.savingsPercent}% off):</span>
                    <span className="text-success font-semibold">${vendorPricing.bulkPrice.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total cost ({coop.totalQuantity} units):</span>
                    <span className="font-bold">${vendorPricing.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">You save:</span>
                    <span className="text-success font-semibold">${vendorPricing.totalSavings.toFixed(2)}</span>
                  </div>
                  {vendorPricing.priceSource === 'estimated' && (
                    <p className="text-xs text-warning mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Estimated pricing — actual price may vary once vendor confirms.
                    </p>
                  )}
                </div>
              ) : null
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSelectVendor} disabled={actionLoading === 'vendor' || !selectedVendorId}>
              {actionLoading === 'vendor' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Place Bulk Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
