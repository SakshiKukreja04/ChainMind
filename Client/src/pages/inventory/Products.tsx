import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockProducts } from '@/data/mockData';
import { Search, Plus, Edit2, Filter, Package } from 'lucide-react';
import type { Product } from '@/types';

export default function Products() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleStockUpdate = (id: string, newStock: number) => {
    setProducts(prev => 
      prev.map(p => {
        if (p.id === id) {
          const status = newStock === 0 ? 'out-of-stock' : newStock < p.minStock ? 'low-stock' : 'in-stock';
          return { ...p, stock: newStock, status };
        }
        return p;
      })
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Manage your product stock levels.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products or SKU..."
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

      {/* Products Table */}
      <div className="card-dashboard overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Stock</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Min Stock</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-sm text-muted-foreground">{product.sku}</td>
                  <td className="py-3 px-4">
                    {editingId === product.id ? (
                      <Input
                        type="number"
                        defaultValue={product.stock}
                        className="w-20 h-8"
                        autoFocus
                        onBlur={(e) => handleStockUpdate(product.id, parseInt(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleStockUpdate(product.id, parseInt((e.target as HTMLInputElement).value) || 0);
                          }
                        }}
                      />
                    ) : (
                      <span className={`font-medium ${
                        product.status === 'out-of-stock' ? 'text-destructive' :
                        product.status === 'low-stock' ? 'text-warning' :
                        'text-foreground'
                      }`}>
                        {product.stock}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{product.minStock}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{product.vendorName}</td>
                  <td className="py-3 px-4">
                    <span className={`status-badge ${
                      product.status === 'in-stock' ? 'status-success' :
                      product.status === 'low-stock' ? 'status-warning' :
                      'status-error'
                    }`}>
                      {product.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingId(product.id)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No products found</p>
          <p className="text-muted-foreground">Try adjusting your search terms.</p>
        </div>
      )}
    </div>
  );
}
