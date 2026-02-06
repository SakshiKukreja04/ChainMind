import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cooperativeApi, inventoryApi } from '@/lib/api';
import type { CooperativeBuy, Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, RefreshCw, Users, Package, TrendingDown, Plus,
  Search, ArrowRight, BadgePercent, ShoppingCart, Eye, Handshake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// ─── Status badge colours ─────────────────────────────────────

const statusConfig: Record<CooperativeBuy['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PROPOSED: { label: 'Proposed', variant: 'secondary' },
  APPROVED: { label: 'Approved', variant: 'default' },
  ORDERED: { label: 'Ordered', variant: 'default' },
  DELIVERED: { label: 'Delivered', variant: 'outline' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

// ─── Component ─────────────────────────────────────────────────

export default function CooperativeBuying() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // My cooperatives
  const [myGroups, setMyGroups] = useState<CooperativeBuy[]>([]);
  const [myTotal, setMyTotal] = useState(0);

  // Open groups to join
  const [openGroups, setOpenGroups] = useState<CooperativeBuy[]>([]);
  const [openTotal, setOpenTotal] = useState(0);

  // Products (for the "Create" dialog)
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [requestedQty, setRequestedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Data fetching ──────────────────────────────────────────

  async function fetchAll() {
    setLoading(true);
    try {
      const [myRes, openRes, prodRes] = await Promise.all([
        cooperativeApi.list(),
        cooperativeApi.openGroups(),
        inventoryApi.getProducts(),
      ]);
      if (myRes.success) {
        setMyGroups(myRes.data.groups);
        setMyTotal(myRes.data.total);
      }
      if (openRes.success) {
        setOpenGroups(openRes.data.groups);
        setOpenTotal(openRes.data.total);
      }
      // Handle products response – may be array or { data: { products } }
      const prods = Array.isArray(prodRes) ? prodRes : (prodRes as any)?.data?.products ?? (prodRes as any)?.products ?? [];
      setProducts(prods);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  // ── Create cooperative ─────────────────────────────────────

  async function handleCreate() {
    if (!selectedProduct || !requestedQty) {
      toast({ title: 'Missing fields', description: 'Select a product and enter quantity', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await cooperativeApi.create({
        productId: selectedProduct,
        requestedQty: Number(requestedQty),
        notes: notes || undefined,
      });
      if (res.success) {
        toast({ title: 'Success', description: 'Cooperative group created!' });
        setCreateOpen(false);
        setSelectedProduct('');
        setRequestedQty('');
        setNotes('');
        fetchAll();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create group', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  // ── Filtering ──────────────────────────────────────────────

  const filteredMy = myGroups.filter(
    (g) =>
      g.productName.toLowerCase().includes(search.toLowerCase()) ||
      g.category.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredOpen = openGroups.filter(
    (g) =>
      g.productName.toLowerCase().includes(search.toLowerCase()) ||
      g.category.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cooperative Buying</h1>
          <p className="text-muted-foreground">
            Pool demand with other businesses and save on bulk orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New Co-Buy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a Cooperative Buy</DialogTitle>
                <DialogDescription>
                  Select a product from your inventory to find matching partners.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category}) — Stock: {p.currentStock}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Requested Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 50"
                    value={requestedQty}
                    onChange={(e) => setRequestedQty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="Any additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Handshake className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{myTotal}</p>
            <p className="text-sm text-muted-foreground">My Groups</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Users className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{openTotal}</p>
            <p className="text-sm text-muted-foreground">Open Groups</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <BadgePercent className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {myGroups.length > 0
                ? Math.round(myGroups.reduce((s, g) => s + g.estimatedSavingsPercent, 0) / myGroups.length)
                : 0}%
            </p>
            <p className="text-sm text-muted-foreground">Avg Savings</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-destructive/10">
            <ShoppingCart className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {myGroups.filter((g) => g.status === 'ORDERED').length}
            </p>
            <p className="text-sm text-muted-foreground">Active Orders</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by product name or category..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-groups" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="my-groups" className="gap-2">
            <Handshake className="h-4 w-4" />
            My Groups ({filteredMy.length})
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-2">
            <Search className="h-4 w-4" />
            Discover ({filteredOpen.length})
          </TabsTrigger>
        </TabsList>

        {/* My Groups */}
        <TabsContent value="my-groups">
          {filteredMy.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Handshake className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No cooperative groups yet</p>
              <p className="text-sm mt-1">Create one to start saving on bulk orders.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredMy.map((group) => (
                <CooperativeCard
                  key={group._id}
                  group={group}
                  onView={() => navigate(`/sme/cooperative-buy/${group._id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Discover Open Groups */}
        <TabsContent value="discover">
          {filteredOpen.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No open groups found</p>
              <p className="text-sm mt-1">Check back later or create your own cooperative group.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredOpen.map((group) => (
                <CooperativeCard
                  key={group._id}
                  group={group}
                  onView={() => navigate(`/sme/cooperative-buy/${group._id}`)}
                  isOpen
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Card Component ─────────────────────────────────────────

interface CooperativeCardProps {
  group: CooperativeBuy;
  onView: () => void;
  isOpen?: boolean;
}

function CooperativeCard({ group, onView, isOpen }: CooperativeCardProps) {
  const sc = statusConfig[group.status];

  return (
    <div className="card-dashboard p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-5 w-5 text-primary shrink-0" />
            <h3 className="text-base font-semibold text-foreground truncate">
              {group.productName}
            </h3>
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium text-foreground">{group.category}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Participants</p>
              <p className="font-medium text-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {group.participants.length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Qty</p>
              <p className="font-medium text-foreground">{group.totalQuantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Est. Savings</p>
              <p className="font-medium text-success flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" />
                {group.estimatedSavingsPercent}%
              </p>
            </div>
          </div>

          {/* Participant avatars */}
          <div className="flex items-center gap-2 mt-3">
            {group.participants.slice(0, 3).map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-background"
                title={typeof p.businessId === 'object' ? p.businessId.businessName : ''}
              >
                {typeof p.businessId === 'object'
                  ? p.businessId.businessName?.charAt(0).toUpperCase()
                  : '?'}
              </span>
            ))}
            {group.participants.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{group.participants.length - 3} more
              </span>
            )}
            {isOpen && (
              <span className="ml-auto text-xs text-muted-foreground">
                Started by {typeof group.initiatedByBusiness === 'object'
                  ? group.initiatedByBusiness.businessName
                  : 'Unknown'}
              </span>
            )}
          </div>
        </div>

        <Button variant="ghost" size="icon" className="shrink-0 ml-4" onClick={onView}>
          {isOpen ? <ArrowRight className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
