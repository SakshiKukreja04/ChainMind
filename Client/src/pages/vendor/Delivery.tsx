import { useState } from 'react';
import { mockOrders } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, Package, MapPin, Check } from 'lucide-react';
import type { Order } from '@/types';

const statusFlow = ['approved', 'dispatched', 'in-transit', 'delivered'] as const;

export default function DeliveryStatus() {
  const [orders, setOrders] = useState<Order[]>(
    mockOrders.filter(o => ['dispatched', 'in-transit', 'approved'].includes(o.status))
  );

  const handleStatusUpdate = (id: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Delivery Status</h1>
        <p className="text-muted-foreground">Update order delivery progress.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <Package className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{orders.filter(o => o.status === 'approved').length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{orders.filter(o => o.status === 'dispatched').length}</p>
            <p className="text-xs text-muted-foreground">Dispatched</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/10">
            <MapPin className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{orders.filter(o => o.status === 'in-transit').length}</p>
            <p className="text-xs text-muted-foreground">In Transit</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <Check className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{orders.filter(o => o.status === 'delivered').length}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="space-y-4">
        {orders.map((order) => {
          const currentIndex = statusFlow.indexOf(order.status as any);
          
          return (
            <div key={order.id} className="card-dashboard">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-medium text-primary">{order.id}</span>
                    <span className={`status-badge ${
                      order.status === 'delivered' ? 'status-success' :
                      order.status === 'in-transit' ? 'status-info' :
                      order.status === 'dispatched' ? 'status-info' :
                      'status-warning'
                    }`}>
                      {order.status.replace('-', ' ')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{order.productName}</h3>
                  <p className="text-sm text-muted-foreground">Qty: {order.quantity} • Est. Delivery: {order.estimatedDelivery}</p>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 max-w-md">
                  <div className="flex items-center gap-1">
                    {statusFlow.map((status, index) => (
                      <div key={status} className="flex items-center flex-1">
                        <div className={`h-2 flex-1 rounded-full ${
                          index <= currentIndex ? 'bg-primary' : 'bg-muted'
                        }`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {statusFlow.map((status) => (
                      <span key={status} className="text-[10px] text-muted-foreground capitalize">
                        {status.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status Update */}
                {order.status !== 'delivered' && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusUpdate(order.id, value as Order['status'])}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                        <SelectItem value="in-transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm">Update</Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="card-dashboard text-center py-12">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No active deliveries</p>
          <p className="text-muted-foreground">All orders have been delivered.</p>
        </div>
      )}
    </div>
  );
}
