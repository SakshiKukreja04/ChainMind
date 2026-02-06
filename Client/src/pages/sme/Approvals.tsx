import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Package,
  Loader2,
  RefreshCw,
  User,
  ShoppingCart,
  Brain,
  AlertTriangle,
  Truck,
} from 'lucide-react';
import { vendorApi, orderApi, type VendorResponse, type OrderResponse } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';

export default function Approvals() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || '';
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [rejectDialog, setRejectDialog] = useState<OrderResponse | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { on } = useSocket();

  // ── Fetch vendors ───────────────────────────────────────────
  const fetchVendors = useCallback(async () => {
    try {
      setLoadingVendors(true);
      const res = await vendorApi.getVendors();
      setVendors(res.vendors);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load vendors';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoadingVendors(false);
    }
  }, [toast]);

  // ── Fetch pending orders ────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const res = await orderApi.list();
      setOrders(res.orders);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoadingOrders(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVendors();
    fetchOrders();
  }, [fetchVendors, fetchOrders]);

  // ── Socket events ───────────────────────────────────────────
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

  useEffect(() => {
    const unsub = on('order:pending-approval', () => {
      fetchOrders();
      toast({ title: 'New Order Request', description: 'A reorder request needs your approval' });
    });
    return unsub;
  }, [on, fetchOrders, toast]);

  useEffect(() => {
    const unsub = on('order:approved', () => { fetchOrders(); });
    return unsub;
  }, [on, fetchOrders]);

  useEffect(() => {
    const unsub = on('order:rejected', () => { fetchOrders(); });
    return unsub;
  }, [on, fetchOrders]);

  useEffect(() => {
    const unsub1 = on('order:confirmed', () => { fetchOrders(); });
    const unsub2 = on('order:dispatched', () => { fetchOrders(); });
    const unsub3 = on('order:delivered', () => { fetchOrders(); });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on, fetchOrders]);

  // ── Vendor handlers ─────────────────────────────────────────
  const pendingVendors = vendors.filter((v) => v.status === 'PENDING');
  const approvedVendors = vendors.filter((v) => v.status === 'APPROVED');
  const rejectedVendors = vendors.filter((v) => v.status === 'REJECTED');

  const handleApproveVendor = async (id: string) => {
    try {
      const res = await vendorApi.approveVendor(id);
      setVendors((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, status: 'APPROVED', reliabilityScore: res.vendor.reliabilityScore ?? 100, isApproved: true }
            : v,
        ),
      );
      toast({ title: 'Approved', description: `${res.vendor.name} approved — credentials sent to ${res.vendor.email || 'vendor email'}` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleRejectVendor = async (id: string) => {
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

  // ── Order handlers ──────────────────────────────────────────
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_APPROVAL');
  const approvedOrders = orders.filter((o) => o.status === 'APPROVED');
  const rejectedOrders = orders.filter((o) => o.status === 'REJECTED');
  const dispatchedOrders = orders.filter((o) => o.status === 'DISPATCHED');
  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  const handleMarkReceived = async (id: string) => {
    setReceivingId(id);
    try {
      await orderApi.markReceived(id);
      toast({ title: 'Order Received', description: 'Stock updated & vendor score recalculated' });
      fetchOrders();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to mark received', variant: 'destructive' });
    } finally {
      setReceivingId(null);
    }
  };

  const handleApproveOrder = async (id: string) => {
    try {
      const res = await orderApi.approve(id);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'APPROVED' } : o)),
      );
      toast({ title: 'Order Approved', description: `Order for ${res.order.productName} approved` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve order';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectDialog) return;
    setRejecting(true);
    try {
      await orderApi.reject(rejectDialog.id, rejectReason || undefined);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === rejectDialog.id ? { ...o, status: 'REJECTED', rejectionReason: rejectReason } : o,
        ),
      );
      toast({ title: 'Order Rejected', description: `Order for ${rejectDialog.productName} rejected` });
      setRejectDialog(null);
      setRejectReason('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject order';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setRejecting(false);
    }
  };

  const loading = loadingVendors && loadingOrders;
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
          <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
          <p className="text-muted-foreground">Manage vendor and order approval requests.</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => { fetchVendors(); fetchOrders(); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pendingVendors.length}</p>
            <p className="text-sm text-muted-foreground">Vendor Pending</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pendingOrders.length}</p>
            <p className="text-sm text-muted-foreground">Orders Pending</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{approvedVendors.length + approvedOrders.length}</p>
            <p className="text-sm text-muted-foreground">Total Approved</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-destructive/10">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{rejectedVendors.length + rejectedOrders.length}</p>
            <p className="text-sm text-muted-foreground">Total Rejected</p>
          </div>
        </div>
      </div>

      {/* Main Tabs: Vendors / Orders */}
      <Tabs defaultValue={initialTab === 'orders' ? 'orders' : initialTab === 'tracking' ? 'tracking' : initialTab === 'vendors' ? 'vendors' : pendingOrders.length > 0 ? 'orders' : 'vendors'} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Order Approvals ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2">
            <Truck className="h-4 w-4" />
            Order Tracking ({dispatchedOrders.length + confirmedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2">
            <Package className="h-4 w-4" />
            Vendor Approvals ({pendingVendors.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Order Approvals ──────────────────────────────────── */}
        <TabsContent value="orders">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" /> Pending ({pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle className="h-4 w-4" /> Approved ({approvedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="h-4 w-4" /> Rejected ({rejectedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingOrders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingOrders.map((order) => (
                    <OrderApprovalCard
                      key={order.id}
                      order={order}
                      onApprove={() => handleApproveOrder(order.id)}
                      onReject={() => { setRejectDialog(order); setRejectReason(''); }}
                    />
                  ))}
                </div>
              ) : (
                <div className="card-dashboard text-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">All caught up!</p>
                  <p className="text-muted-foreground">No pending order requests at the moment.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved">
              {approvedOrders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {approvedOrders.map((order) => (
                    <div key={order.id} className="card-dashboard">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-success/10">
                          <CheckCircle className="h-5 w-5 text-success" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{order.productName}</h4>
                          <p className="text-sm text-muted-foreground">{order.quantity} units — ${order.totalValue?.toLocaleString()}</p>
                          <p className="text-sm text-success font-medium mt-2">Approved</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-dashboard text-center py-12">
                  <p className="text-muted-foreground">No approved orders yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected">
              {rejectedOrders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {rejectedOrders.map((order) => (
                    <div key={order.id} className="card-dashboard opacity-75">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-destructive/10">
                          <XCircle className="h-5 w-5 text-destructive" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{order.productName}</h4>
                          <p className="text-sm text-muted-foreground">{order.quantity} units</p>
                          {order.rejectionReason && (
                            <p className="text-sm text-muted-foreground mt-1">Reason: {order.rejectionReason}</p>
                          )}
                          <p className="text-sm text-destructive font-medium mt-2">Rejected</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-dashboard text-center py-12">
                  <p className="text-muted-foreground">No rejected orders.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── Order Tracking ───────────────────────────────────── */}
        <TabsContent value="tracking">
          <Tabs defaultValue="dispatched" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="dispatched" className="gap-2">
                <Truck className="h-4 w-4" /> Dispatched ({dispatchedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="gap-2">
                <CheckCircle className="h-4 w-4" /> Confirmed ({confirmedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="delivered" className="gap-2">
                <Package className="h-4 w-4" /> Delivered ({deliveredOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dispatched">
              {dispatchedOrders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {dispatchedOrders.map((order) => (
                    <div key={order.id} className="card-dashboard border-l-4 border-l-purple-500">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-purple-500/10">
                          <Truck className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{order.productName}</h4>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            <p>{order.quantity} units — ${order.totalValue?.toLocaleString()}</p>
                            <p>Vendor: {order.vendorName}</p>
                            {order.dispatchedAt && (
                              <p>Dispatched: {new Date(order.dispatchedAt).toLocaleDateString()}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="mt-3"
                            onClick={() => handleMarkReceived(order.id)}
                            disabled={receivingId === order.id}
                          >
                            {receivingId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Mark as Received
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-dashboard text-center py-12">
                  <p className="text-muted-foreground">No dispatched orders awaiting receipt.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="confirmed">
              {confirmedOrders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {confirmedOrders.map((order) => (
                    <div key={order.id} className="card-dashboard">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-amber-500/10">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{order.productName}</h4>
                          <p className="text-sm text-muted-foreground">{order.quantity} units — {order.vendorName}</p>
                          <p className="text-sm text-amber-600 font-medium mt-2">Confirmed — Awaiting Dispatch</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-dashboard text-center py-12">
                  <p className="text-muted-foreground">No confirmed orders.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="delivered">
              {deliveredOrders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {deliveredOrders.map((order) => (
                    <div key={order.id} className="card-dashboard">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-green-500/10">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{order.productName}</h4>
                          <p className="text-sm text-muted-foreground">{order.quantity} units — {order.vendorName}</p>
                          {order.actualDeliveryDate && (
                            <p className="text-sm text-muted-foreground">
                              Received: {new Date(order.actualDeliveryDate).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-sm text-green-600 font-medium mt-2">✓ Delivered & Stock Updated</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-dashboard text-center py-12">
                  <p className="text-muted-foreground">No delivered orders.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── Vendor Approvals ─────────────────────────────────── */}
        <TabsContent value="vendors">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" /> Pending ({pendingVendors.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle className="h-4 w-4" /> Approved ({approvedVendors.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="h-4 w-4" /> Rejected ({rejectedVendors.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingVendors.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingVendors.map((vendor) => (
                    <VendorApprovalCard
                      key={vendor.id}
                      vendor={vendor}
                      onApprove={handleApproveVendor}
                      onReject={handleRejectVendor}
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
        </TabsContent>
      </Tabs>

      {/* Reject Order Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
          </DialogHeader>
          {rejectDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium">{rejectDialog.productName}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {rejectDialog.quantity} units — ${rejectDialog.totalValue?.toLocaleString()}
                </p>
                {rejectDialog.aiRecommendation && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    AI confidence: {(rejectDialog.aiRecommendation.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Reason (optional)</label>
                <Textarea
                  placeholder="Why are you rejecting this order?"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectOrder} disabled={rejecting}>
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              <span className="ml-1">Reject Order</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ── Order Approval Card ─────────────────────────────────────────
function OrderApprovalCard({
  order,
  onApprove,
  onReject,
}: {
  order: OrderResponse;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [acting, setActing] = useState(false);
  const ai = order.aiRecommendation;
  const isLowConf = ai && ai.confidence < 0.6;

  const handle = async (action: 'approve' | 'reject') => {
    setActing(true);
    if (action === 'approve') await onApprove();
    else onReject();
    setActing(false);
  };

  return (
    <div className="card-dashboard border-l-4 border-l-primary">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShoppingCart className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-lg">{order.productName}</h4>
          <p className="text-sm text-muted-foreground">{order.productSku}</p>

          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div>
              <span className="text-muted-foreground">Quantity:</span>{' '}
              <span className="font-medium">{order.quantity} units</span>
            </div>
            <div>
              <span className="text-muted-foreground">Value:</span>{' '}
              <span className="font-medium">${order.totalValue?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Vendor:</span>{' '}
              <span className="font-medium">{order.vendorName || 'Not assigned'}</span>
            </div>
            {order.createdBy && (
              <div className="flex items-center gap-1 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">By:</span>{' '}
                <span className="font-medium">{order.createdBy.name}</span>
              </div>
            )}
          </div>

          {ai && (
            <div className="bg-muted/50 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">AI Recommendation</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span>Forecasted: <strong>{ai.forecastedDemand}/day</strong></span>
                <span>Recommended: <strong>{ai.recommendedQuantity} units</strong></span>
                <span>Confidence: <strong>{(ai.confidence * 100).toFixed(0)}%</strong></span>
              </div>
              {isLowConf && (
                <div className="flex items-center gap-1 text-xs text-warning mt-2">
                  <AlertTriangle className="h-3 w-3" />
                  Low confidence — review carefully
                </div>
              )}
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
              <span className="ml-1">Approve</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => handle('reject')}
              disabled={acting}
            >
              <XCircle className="h-4 w-4" />
              <span className="ml-1">Reject</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vendor Approval Card ────────────────────────────────────────
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
          {vendor.email && (
            <p className="text-sm text-muted-foreground">{vendor.email}</p>
          )}

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
              <span className="ml-1">Approve</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => handle('reject')}
              disabled={acting}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              <span className="ml-1">Reject</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
