import { StatCard } from '@/components/dashboard/StatCard';
import { dashboardStats, mockAlerts, mockOrders } from '@/data/mockData';
import { 
  Package, 
  ShoppingCart, 
  Truck, 
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';

export default function InventoryDashboard() {
  const stats = dashboardStats.inventoryManager;

  const todaysTasks = [
    { id: 1, task: 'Review low stock alerts', status: 'pending', priority: 'high' },
    { id: 2, task: 'Process ORD-001 reorder request', status: 'in-progress', priority: 'high' },
    { id: 3, task: 'Update minimum stock levels', status: 'pending', priority: 'medium' },
    { id: 4, task: 'Verify incoming delivery from PharmaDirect', status: 'completed', priority: 'medium' },
    { id: 5, task: 'Contact vendor about delayed shipment', status: 'pending', priority: 'low' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Inventory overview and daily tasks.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Below Threshold"
          value={stats.productsBelowThreshold}
          icon={Package}
          variant="warning"
        />
        <StatCard
          title="Orders Pending"
          value={stats.ordersPending}
          icon={ShoppingCart}
          variant="primary"
        />
        <StatCard
          title="Deliveries Today"
          value={stats.deliveriesToday}
          icon={Truck}
          variant="success"
        />
        <StatCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={Bell}
          variant="destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="card-dashboard">
          <h3 className="text-lg font-semibold text-foreground mb-4">Today's Tasks</h3>
          <div className="space-y-3">
            {todaysTasks.map((task) => (
              <div 
                key={task.id} 
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {task.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                ) : task.status === 'in-progress' ? (
                  <Clock className="h-5 w-5 text-warning shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground shrink-0" />
                )}
                <span className={`flex-1 ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {task.task}
                </span>
                <span className={`status-badge ${
                  task.priority === 'high' ? 'status-error' : 
                  task.priority === 'medium' ? 'status-warning' : 
                  'status-info'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="card-dashboard">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Alerts</h3>
            <a href="/inventory/alerts" className="text-sm text-primary hover:underline">View all</a>
          </div>
          <div className="space-y-3">
            {mockAlerts.slice(0, 4).map((alert) => (
              <div 
                key={alert.id} 
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  alert.severity === 'error' ? 'bg-destructive/5' :
                  alert.severity === 'warning' ? 'bg-warning/5' :
                  'bg-muted/30'
                }`}
              >
                <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                  alert.severity === 'error' ? 'text-destructive' :
                  alert.severity === 'warning' ? 'text-warning' :
                  'text-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{alert.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                </div>
                {!alert.read && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card-dashboard">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Recent Orders</h3>
          <a href="/inventory/orders" className="text-sm text-primary hover:underline">View all</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Qty</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.slice(0, 4).map((order) => (
                <tr key={order.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="py-3 px-4 font-mono text-sm font-medium text-primary">{order.id}</td>
                  <td className="py-3 px-4 text-sm">{order.productName}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{order.vendorName}</td>
                  <td className="py-3 px-4 text-sm">{order.quantity}</td>
                  <td className="py-3 px-4">
                    <span className={`status-badge ${
                      order.status === 'delivered' ? 'status-success' :
                      order.status === 'pending' ? 'status-warning' :
                      order.status === 'rejected' ? 'status-error' :
                      'status-info'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
