import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  Package,
  ShoppingCart,
  Bell,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { inventoryApi, alertApi, type ProductResponse, type AlertResponse } from '@/lib/api';
import { Link } from 'react-router-dom';

export default function InventoryDashboard() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, alertRes] = await Promise.all([
        inventoryApi.getProducts(),
        alertApi.getAlerts(),
      ]);
      setProducts(prodRes.products);
      setAlerts(alertRes.alerts);
    } catch {
      // silently handle — individual pages show errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const belowThreshold = products.filter((p) => p.status === 'low-stock' || p.status === 'out-of-stock').length;
  const outOfStock = products.filter((p) => p.status === 'out-of-stock').length;
  const activeAlerts = alerts.filter((a) => !a.read).length;
  const totalProducts = products.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Inventory overview and alerts.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          variant="primary"
        />
        <StatCard
          title="Below Threshold"
          value={belowThreshold}
          icon={ShoppingCart}
          variant="warning"
        />
        <StatCard
          title="Out of Stock"
          value={outOfStock}
          icon={Package}
          variant="destructive"
        />
        <StatCard
          title="Active Alerts"
          value={activeAlerts}
          icon={Bell}
          variant="destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Products */}
        <div className="card-dashboard">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Low Stock Products</h3>
            <Link to="/inventory/products" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {products
              .filter((p) => p.status !== 'in-stock')
              .slice(0, 5)
              .map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Package className={`h-5 w-5 shrink-0 ${product.status === 'out-of-stock' ? 'text-destructive' : 'text-warning'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${product.status === 'out-of-stock' ? 'text-destructive' : 'text-warning'}`}>
                      {product.currentStock}
                    </p>
                    <p className="text-xs text-muted-foreground">min: {product.minThreshold}</p>
                  </div>
                  <span
                    className={`status-badge ${
                      product.status === 'out-of-stock' ? 'status-error' : 'status-warning'
                    }`}
                  >
                    {product.status.replace('-', ' ')}
                  </span>
                </div>
              ))}
            {products.filter((p) => p.status !== 'in-stock').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">All products are well-stocked!</p>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="card-dashboard">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Alerts</h3>
            <Link to="/inventory/alerts" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  alert.severity === 'error'
                    ? 'bg-destructive/5'
                    : 'bg-warning/5'
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 shrink-0 mt-0.5 ${
                    alert.severity === 'error' ? 'text-destructive' : 'text-warning'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{alert.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                </div>
                {!alert.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No alerts — all clear!</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Products Table */}
      <div className="card-dashboard">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Recently Added Products</h3>
          <Link to="/inventory/products" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Stock</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 5).map((product) => (
                <tr key={product.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="py-3 px-4 text-sm font-medium">{product.name}</td>
                  <td className="py-3 px-4 font-mono text-sm text-muted-foreground">{product.sku}</td>
                  <td className="py-3 px-4 text-sm">{product.currentStock}</td>
                  <td className="py-3 px-4 text-sm">{product.sellingPrice?.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`status-badge ${
                        product.status === 'in-stock'
                          ? 'status-success'
                          : product.status === 'low-stock'
                          ? 'status-warning'
                          : 'status-error'
                      }`}
                    >
                      {product.status.replace('-', ' ')}
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
