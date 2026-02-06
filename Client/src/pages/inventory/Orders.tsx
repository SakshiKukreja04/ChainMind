import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockOrders } from '@/data/mockData';
import { Search, Plus, Filter, ShoppingCart } from 'lucide-react';
import type { Order } from '@/types';

export default function Orders() {
  const [orders] = useState<Order[]>(mockOrders);
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.productName.toLowerCase().includes(search.toLowerCase()) ||
    o.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  const statusOrder = ['pending', 'approved', 'dispatched', 'in-transit', 'delivered', 'rejected'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage reorder requests and track deliveries.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Create Reorder
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statusOrder.map((status) => {
          const count = orders.filter(o => o.status === status).length;
          return (
            <div key={status} className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{status.replace('-', ' ')}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Orders Table */}
      <div className="card-dashboard overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Qty</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Est. Delivery</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="py-3 px-4 font-mono text-sm font-medium text-primary">{order.id}</td>
                  <td className="py-3 px-4 text-sm">{order.productName}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{order.vendorName}</td>
                  <td className="py-3 px-4 text-sm">{order.quantity}</td>
                  <td className="py-3 px-4 text-sm font-medium">${order.totalAmount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{order.estimatedDelivery}</td>
                  <td className="py-3 px-4">
                    <span className={`status-badge ${
                      order.status === 'delivered' ? 'status-success' :
                      order.status === 'pending' ? 'status-warning' :
                      order.status === 'rejected' ? 'status-error' :
                      'status-info'
                    }`}>
                      {order.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No orders found</p>
          <p className="text-muted-foreground">Try adjusting your search terms.</p>
        </div>
      )}
    </div>
  );
}
