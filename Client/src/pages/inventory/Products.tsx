import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Edit2, Filter, Package, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { inventoryApi, type ProductResponse, type ProductPayload } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';

export default function Products() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const { on } = useSocket();

  // Form state for Add Product
  const [form, setForm] = useState<ProductPayload>({
    name: '',
    sku: '',
    category: '',
    costPrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minThreshold: 10,
    description: '',
  });

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getProducts();
      setProducts(res.products);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load products';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Real-time Socket.IO listeners
  useEffect(() => {
    const unsub1 = on('inventory:product-added', (data) => {
      const product = data as ProductResponse;
      setProducts((prev) => [product, ...prev]);
    });

    const unsub2 = on('inventory:stock-updated', (data) => {
      const update = data as { id: string; currentStock: number; minThreshold: number };
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === update.id) {
            const status =
              update.currentStock === 0
                ? 'out-of-stock'
                : update.currentStock < update.minThreshold
                ? 'low-stock'
                : 'in-stock';
            return { ...p, currentStock: update.currentStock, status } as ProductResponse;
          }
          return p;
        }),
      );
    });

    const unsub3 = on('inventory:stock-corrected', (data) => {
      const update = data as { id: string; currentStock: number };
      setProducts((prev) =>
        prev.map((p) => (p.id === update.id ? { ...p, currentStock: update.currentStock } : p)),
      );
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [on]);

  // Filter
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stock inline edit
  const handleStockUpdate = async (id: string, newStock: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const change = newStock - product.currentStock;
    if (change === 0) {
      setEditingId(null);
      return;
    }
    try {
      await inventoryApi.correctStock(id, newStock, 'Inline stock correction');
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const status =
              newStock === 0
                ? 'out-of-stock'
                : newStock < p.minThreshold
                ? 'low-stock'
                : 'in-stock';
            return { ...p, currentStock: newStock, status } as ProductResponse;
          }
          return p;
        }),
      );
      toast({ title: 'Stock updated', description: `${product.name} stock set to ${newStock}` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update stock';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
    setEditingId(null);
  };

  // Add product
  const handleAddProduct = async () => {
    if (!form.name || !form.sku || !form.category) {
      toast({ title: 'Validation', description: 'Name, SKU, and Category are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const res = await inventoryApi.addProduct(form);
      // Socket.IO will also push, but add immediately for responsiveness
      setProducts((prev) => {
        const exists = prev.find((p) => p.id === res.product.id);
        return exists ? prev : [res.product, ...prev];
      });
      toast({ title: 'Product added', description: `${res.product.name} (${res.product.sku})` });
      setAddOpen(false);
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add product';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete product (soft)
  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!confirm(`Delete "${product?.name}"? This action can be reversed.`)) return;
    try {
      await inventoryApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Deleted', description: `${product?.name} removed` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete product';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setForm({ name: '', sku: '', category: '', costPrice: 0, sellingPrice: 0, currentStock: 0, minThreshold: 10, description: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : `${products.length} products managed`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchProducts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Fill in the product details. Fields marked * are required.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Paracetamol 500mg" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="PARA-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Medication" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Cost Price *</Label>
                    <Input id="costPrice" type="number" min={0} step={0.01} value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sellingPrice">Selling Price *</Label>
                    <Input id="sellingPrice" type="number" min={0} step={0.01} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentStock">Initial Stock</Label>
                    <Input id="currentStock" type="number" min={0} value={form.currentStock || 0} onChange={(e) => setForm({ ...form, currentStock: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minThreshold">Min Threshold</Label>
                    <Input id="minThreshold" type="number" min={0} value={form.minThreshold || 10} onChange={(e) => setForm({ ...form, minThreshold: parseInt(e.target.value) || 10 })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddProduct} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="card-dashboard overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cost</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Price</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Stock</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Min</th>
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
                    <td className="py-3 px-4 text-sm text-muted-foreground">{product.costPrice?.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm font-medium">{product.sellingPrice?.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      {editingId === product.id ? (
                        <Input
                          type="number"
                          defaultValue={product.currentStock}
                          className="w-20 h-8"
                          autoFocus
                          onBlur={(e) => handleStockUpdate(product.id, parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleStockUpdate(product.id, parseInt((e.target as HTMLInputElement).value) || 0);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      ) : (
                        <span
                          className={`font-medium cursor-pointer ${
                            product.status === 'out-of-stock'
                              ? 'text-destructive'
                              : product.status === 'low-stock'
                              ? 'text-warning'
                              : 'text-foreground'
                          }`}
                          onClick={() => setEditingId(product.id)}
                          title="Click to edit stock"
                        >
                          {product.currentStock}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{product.minThreshold}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{product.vendorName}</td>
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
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(product.id)} title="Edit stock">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No products found</p>
          <p className="text-muted-foreground">
            {products.length === 0 ? 'Add your first product to get started.' : 'Try adjusting your search terms.'}
          </p>
        </div>
      )}
    </div>
  );
}
