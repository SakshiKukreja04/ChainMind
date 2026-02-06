import { useState } from 'react';
import { mockOrders } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, ShoppingCart } from 'lucide-react';
import type { Order } from '@/types';

export default function VendorOrders() {
  const [orders, setOrders] = useState<Order[]>(
    mockOrders.filter(o => o.status === 'approved' || o.status === 'dispatched' || o.status === 'in-transit')
  );

  const handleAccept = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'dispatched' } : o));
  };

  const handleReject = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'rejected' } : o));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground">Manage incoming orders from businesses.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {orders.filter(o => o.status === 'approved').length}
            </p>
            <p className="text-sm text-muted-foreground">Awaiting Action</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-secondary/10">
            <ShoppingCart className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {orders.filter(o => o.status === 'dispatched' || o.status === 'in-transit').length}
            </p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <Check className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {mockOrders.filter(o => o.status === 'delivered').length}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
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
                  <span className="font-mono text-sm font-medium text-primary">{order.id}</span>
                  <span className={`status-badge ${
                    order.status === 'approved' ? 'status-warning' :
                    order.status === 'dispatched' || order.status === 'in-transit' ? 'status-info' :
                    order.status === 'delivered' ? 'status-success' :
                    'status-error'
                  }`}>
                    {order.status.replace('-', ' ')}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{order.productName}</h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Qty: {order.quantity}</span>
                  <span>•</span>
                  <span>${order.totalAmount.toLocaleString()}</span>
                  <span>•</span>
                  <span>Due: {order.estimatedDelivery}</span>
                </div>
              </div>
              
              {order.status === 'approved' && (
                <div className="flex gap-2">
                  <Button variant="success" size="sm" onClick={() => handleAccept(order.id)}>
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleReject(order.id)} className="text-destructive">
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4" />
                    Delay
                  </Button>
                </div>
              )}
              
              {(order.status === 'dispatched' || order.status === 'in-transit') && (
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="card-dashboard text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No orders</p>
          <p className="text-muted-foreground">You don't have any active orders.</p>
        </div>
      )}
    </div>
  );
}
