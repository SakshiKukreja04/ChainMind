import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { vendorApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Building2, MapPin, Save, Loader2, Star, Calendar, Package } from 'lucide-react';

interface VendorProfile {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  productsSupplied: string[];
  status: string;
  reliabilityScore: number;
  totalOrders: number;
  paymentTerms: string;
  rating: number;
  business: { id: string; name: string; location: string; industry: string } | null;
  createdAt: string;
}

export default function VendorProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [userName, setUserName] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await vendorApi.getMyProfile();
      if (res.success && res.vendor) {
        const v = res.vendor;
        setVendor(v);
        setName(v.name || '');
        setContact(v.contact || '');
        setEmail(v.email || res.user?.email || '');
        setPhone(v.phone || res.user?.phone || '');
        setAddress(v.address || '');
        setPaymentTerms(v.paymentTerms || '');
        setUserName(res.user?.name || v.name || '');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await vendorApi.updateMyProfile({ name, contact, email, phone, address, paymentTerms });
      if (res.success) {
        toast({ title: 'Success', description: 'Profile updated successfully' });
        // Refresh profile data
        fetchProfile();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Unable to load vendor profile. Please ensure your account is linked to a vendor entity.</p>
      </div>
    );
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'V';

  const partnerSince = vendor.createdAt
    ? new Date(vendor.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'N/A';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your vendor profile information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card-dashboard text-center">
          <div className="h-24 w-24 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl font-bold text-secondary-foreground">{initials}</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">{vendor.name}</h2>
          <p className="text-muted-foreground capitalize">{vendor.status?.toLowerCase() || 'Active'} Vendor</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <Star className="h-4 w-4 text-warning fill-warning" />
            <span className="font-medium text-foreground">{vendor.reliabilityScore ?? 0}%</span>
            <span className="text-sm text-muted-foreground">reliability</span>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Partner since {partnerSince}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              {vendor.totalOrders || 0} orders completed
            </div>
            {vendor.business && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {vendor.business.name}
              </div>
            )}
          </div>
        </div>

        {/* Edit Profile */}
        <div className="card-dashboard lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-6">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="companyName" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Person</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="contactName" value={contact} onChange={(e) => setContact(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <div className="relative">
                <Input id="paymentTerms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
              </div>
            </div>
          </div>
          <Button className="mt-6" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
