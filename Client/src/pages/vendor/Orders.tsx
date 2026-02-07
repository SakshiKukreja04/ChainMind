import { useState, useEffect, useCallback } from 'react';
import { orderApi, type OrderResponse } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Check,
  Truck,
  Clock,
  ShoppingCart,
  Package,
  Loader2,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Users,
} from 'lucide-react';

const statusColor: Record<string, string> = {
  APPROVED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-amber-100 text-amber-800',
  DISPATCHED: 'bg-purple-100 text-purple-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  VENDOR_REJECTED: 'bg-red-100 text-red-800',
  DELAY_REQUESTED: 'bg-orange-100 text-orange-800',
  PENDING_APPROVAL: 'bg-gray-100 text-gray-800',
};

export default function VendorOrders() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Reject/Delay dialog state
  const [dialogOrder, setDialogOrder] = useState<OrderResponse | null>(null);
  const [dialogAction, setDialogAction] = useState<'REJECT' | 'REQUEST_DELAY' | null>(null);
  const [dialogReason, setDialogReason] = useState('');
  const [dialogNewDate, setDialogNewDate] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);

  const { toast } = useToast();
  const { on } = useSocket();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderApi.vendorOrders();
      setOrders(res.orders);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to load orders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const u1 = on('order:approved', () => fetchOrders());
    const u2 = on('order:confirmed', () => fetchOrders());
    const u3 = on('order:dispatched', () => fetchOrders());
    const u4 = on('order:delivered', () => fetchOrders());
    const u5 = on('order:status-change', () => fetchOrders());
    const u6 = on('delivery:update', () => fetchOrders());
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, [on, fetchOrders]);

  // Accept order (vendor action → CONFIRMED)
  const handleAccept = async (id: string) => {
    setActionInProgress(id);
    try {
      await orderApi.vendorAction(id, 'ACCEPT');
      toast({ title: 'Order Accepted', description: 'Order confirmed successfully' });
      fetchOrders();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed', variant: 'destructive' });
    } finally {
      setActionInProgress(null);
    }
  };

  // Dispatch order (delivery status update)
  const handleDispatch = async (id: string) => {
    setActionInProgress(id);
    try {
      await orderApi.updateDeliveryStatus(id, 'DISPATCHED');
      toast({ title: 'Dispatched', description: 'Order has been dispatched' });
      fetchOrders();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed', variant: 'destructive' });
    } finally {
      setActionInProgress(null);
    }
  };

  // Dialog submit (reject / request delay)
  const handleDialogSubmit = async () => {
    if (!dialogOrder || !dialogAction) return;
    setDialogLoading(true);
    try {
      await orderApi.vendorAction(
        dialogOrder.id,
        dialogAction,
        dialogReason || undefined,
        dialogAction === 'REQUEST_DELAY' ? dialogNewDate || undefined : undefined,
      );
      toast({
        title: dialogAction === 'REJECT' ? 'Order Rejected' : 'Delay Requested',
        description: dialogAction === 'REJECT' ? 'Vendor rejection recorded' : 'Delay request submitted to owner',
      });
      fetchOrders();
      closeDialog();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed', variant: 'destructive' });
    } finally {
      setDialogLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogOrder(null);
    setDialogAction(null);
    setDialogReason('');
    setDialogNewDate('');
  };

  const awaitingAction = orders.filter((o) => o.status === 'APPROVED').length;
  const inProgress = orders.filter((o) => ['CONFIRMED', 'DISPATCHED', 'IN_TRANSIT'].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Incoming Orders</h1>
          <p className="text-muted-foreground">Manage orders assigned to you</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10"><Clock className="h-6 w-6 text-blue-600" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{awaitingAction}</p>
            <p className="text-sm text-muted-foreground">Awaiting Your Action</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10"><Truck className="h-6 w-6 text-purple-600" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{inProgress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-500/10"><Check className="h-6 w-6 text-green-600" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{delivered}</p>
            <p className="text-sm text-muted-foreground">Delivered</p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="card-dashboard">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{order.productName}</span>
                  <Badge className={statusColor[order.status] || 'bg-gray-100 text-gray-800'}>
                    {order.status.replace(/_/g, ' ')}
                  </Badge>
                  {order.cooperativeBuyId && (
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Cooperative Buy{order.cooperativeBuy ? ` (${order.cooperativeBuy.participantCount} businesses)` : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Qty: <strong>{order.quantity}</strong></span>
                  <span>•</span>
                  <span>${order.totalValue?.toLocaleString() ?? '—'}</span>
                  {order.expectedDeliveryDate && (
                    <>
                      <span>•</span>
                      <span>Due: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
                    </>
                  )}
                  {order.createdBy && (
                    <>
                      <span>•</span>
                      <span>From: {order.createdBy.name}</span>
                    </>
                  )}
                </div>
                {order.aiRecommendation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    AI confidence: {Math.round(order.aiRecommendation.confidence * 100)}%
                  </p>
                )}
                {order.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{order.notes}</p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* APPROVED → 3 actions: Accept, Reject, Request Delay */}
                {order.status === 'APPROVED' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(order.id)}
                      disabled={actionInProgress === order.id}
                    >
                      {actionInProgress === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { setDialogOrder(order); setDialogAction('REJECT'); }}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setDialogOrder(order); setDialogAction('REQUEST_DELAY'); }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" /> Delay
                    </Button>
                  </>
                )}

                {order.status === 'CONFIRMED' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDispatch(order.id)}
                    disabled={actionInProgress === order.id}
                  >
                    {actionInProgress === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Truck className="h-4 w-4 mr-1" />}
                    Dispatch
                  </Button>
                )}

                {order.status === 'DISPATCHED' && (
                  <Badge className="bg-purple-100 text-purple-800 text-xs">Awaiting Receipt</Badge>
                )}

                {order.status === 'IN_TRANSIT' && (
                  <Badge className="bg-indigo-100 text-indigo-800 text-xs">In Transit</Badge>
                )}

                {order.status === 'DELIVERED' && (
                  <Badge className="bg-green-100 text-green-800 text-xs">✓ Delivered</Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="card-dashboard text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No orders yet</p>
          <p className="text-muted-foreground">Orders will appear here once approved by the business owner.</p>
        </div>
      )}

      {/* Reject / Delay Dialog */}
      <Dialog open={!!dialogOrder && !!dialogAction} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'REJECT' ? 'Reject Order' : 'Request Delay'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                placeholder={dialogAction === 'REJECT' ? 'Why are you rejecting?' : 'Reason for delay...'}
                value={dialogReason}
                onChange={(e) => setDialogReason(e.target.value)}
              />
            </div>
            {dialogAction === 'REQUEST_DELAY' && (
              <div>
                <label className="text-sm font-medium">New Expected Date</label>
                <Input type="date" value={dialogNewDate} onChange={(e) => setDialogNewDate(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              variant={dialogAction === 'REJECT' ? 'destructive' : 'default'}
              onClick={handleDialogSubmit}
              disabled={dialogLoading}
            >
              {dialogLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {dialogAction === 'REJECT' ? 'Reject Order' : 'Submit Delay Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
