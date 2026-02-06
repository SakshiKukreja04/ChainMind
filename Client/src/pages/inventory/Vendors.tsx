import { mockVendors } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Star, Clock, Package, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function Vendors() {
  const [search, setSearch] = useState('');

  const filteredVendors = mockVendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-muted-foreground">View vendor information and reliability scores.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <div key={vendor.id} className="card-dashboard">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {vendor.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                  <p className="text-sm text-muted-foreground">{vendor.email}</p>
                </div>
              </div>
              <span className={`status-badge ${
                vendor.status === 'active' ? 'status-success' :
                vendor.status === 'pending' ? 'status-warning' :
                'status-error'
              }`}>
                {vendor.status}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning" />
                  <span className="text-sm text-muted-foreground">Reliability</span>
                </div>
                <span className={`font-semibold ${
                  vendor.reliabilityScore >= 90 ? 'text-success' :
                  vendor.reliabilityScore >= 80 ? 'text-warning' :
                  'text-destructive'
                }`}>
                  {vendor.reliabilityScore}%
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-secondary" />
                  <span className="text-sm text-muted-foreground">Lead Time</span>
                </div>
                <span className="font-semibold text-foreground">{vendor.leadTime} days</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Products</span>
                </div>
                <span className="font-semibold text-foreground">{vendor.productsCount}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1">
                <ExternalLink className="h-4 w-4" />
                View Details
              </Button>
              <Button size="sm" className="flex-1">Contact</Button>
            </div>
          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="card-dashboard text-center py-12">
          <p className="text-lg font-medium text-foreground">No vendors found</p>
          <p className="text-muted-foreground">Try adjusting your search terms.</p>
        </div>
      )}
    </div>
  );
}
