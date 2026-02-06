import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Plus, Edit2, Package, Loader2, RefreshCw, Power } from 'lucide-react';
import {
  vendorProductApi,
  type VendorProductResponse,
  type VendorProductPayload,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const emptyForm: VendorProductPayload = {
  name: '',
  sku: '',
  category: '',
  unitPrice: 0,
  minOrderQty: 1,
  leadTimeDays: 7,
};

export default function Catalog() {
  const { toast } = useToast();
  const [products, setProducts] = useState<VendorProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VendorProductPayload>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vendorProductApi.list();
      setProducts(res.products);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load catalog',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Open dialog ──────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (p: VendorProductResponse) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitPrice: p.unitPrice,
      minOrderQty: p.minOrderQty,
      leadTimeDays: p.leadTimeDays,
    });
    setDialogOpen(true);
  };

  // ── Save (create / update) ───────────────────────────────
  const handleSave = async () => {
    if (!form.name || !form.sku || form.unitPrice <= 0) {
      toast({ title: 'Validation', description: 'Name, SKU and price > 0 are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await vendorProductApi.update(editingId, form);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? res.product : p)));
        toast({ title: 'Updated', description: `${res.product.name} updated` });
      } else {
        const res = await vendorProductApi.create(form);
        setProducts((prev) => [res.product, ...prev]);
        toast({ title: 'Created', description: `${res.product.name} added to catalog` });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Save failed',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active/inactive ───────────────────────────────
  const handleToggle = async (p: VendorProductResponse) => {
    try {
      const res = await vendorProductApi.toggleStatus(p.id, !p.isActive);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? res.product : x)));
      toast({ title: res.product.isActive ? 'Activated' : 'Deactivated', description: `${p.name}` });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Toggle failed',
        variant: 'destructive',
      });
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Catalog</h1>
          <p className="text-muted-foreground">
            {loading ? 'Loading…' : `${products.length} products in your catalog`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchProducts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="card-dashboard flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length > 0 ? (
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
                {filtered.map((item) => (
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
                    <td className="py-3 px-4 font-medium">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.minOrderQty} units</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.leadTimeDays} days</td>
                    <td className="py-3 px-4">
                      <span className={`status-badge ${item.isActive ? 'status-success' : 'status-error'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(item)}
                          title={item.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power className={`h-4 w-4 ${item.isActive ? 'text-green-500' : 'text-destructive'}`} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-dashboard text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No products found</p>
          <p className="text-muted-foreground">
            {products.length === 0 ? 'Add your first product to the catalog.' : 'Try adjusting your search.'}
          </p>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Paracetamol 500mg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="PHR-001" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Pain Relief" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unit Price *</Label>
                <Input type="number" min={0} step={0.01} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Min Order Qty</Label>
                <Input type="number" min={1} value={form.minOrderQty || 1} onChange={(e) => setForm({ ...form, minOrderQty: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                <Input type="number" min={0} value={form.leadTimeDays || 7} onChange={(e) => setForm({ ...form, leadTimeDays: parseInt(e.target.value) || 7 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
