import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Edit2, Package } from 'lucide-react';

interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  moq: number;
  leadTime: number;
  category: string;
  inStock: boolean;
}

const initialCatalog: CatalogItem[] = [
  { id: '1', name: 'Paracetamol 500mg', sku: 'PHR-001', price: 5.99, moq: 100, leadTime: 3, category: 'Pain Relief', inStock: true },
  { id: '2', name: 'Vitamin D3 1000IU', sku: 'PHR-003', price: 8.99, moq: 50, leadTime: 3, category: 'Vitamins', inStock: true },
  { id: '3', name: 'Metformin 500mg', sku: 'PHR-007', price: 9.99, moq: 200, leadTime: 5, category: 'Diabetes', inStock: true },
  { id: '4', name: 'Omega-3 Fish Oil', sku: 'PHR-010', price: 12.99, moq: 100, leadTime: 4, category: 'Supplements', inStock: false },
];

export default function Catalog() {
  const [catalog] = useState<CatalogItem[]>(initialCatalog);
  const [search, setSearch] = useState('');

  const filteredCatalog = catalog.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Catalog</h1>
          <p className="text-muted-foreground">Manage your product listings.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Catalog Table */}
      <div className="card-dashboard overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">MOQ</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Lead Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((item) => (
                <tr key={item.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-sm text-muted-foreground">{item.sku}</td>
                  <td className="py-3 px-4 font-medium">${item.price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{item.moq} units</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{item.leadTime} days</td>
                  <td className="py-3 px-4">
                    <span className={`status-badge ${item.inStock ? 'status-success' : 'status-error'}`}>
                      {item.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredCatalog.length === 0 && (
        <div className="card-dashboard text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No products found</p>
          <p className="text-muted-foreground">Try adjusting your search.</p>
        </div>
      )}
    </div>
  );
}
