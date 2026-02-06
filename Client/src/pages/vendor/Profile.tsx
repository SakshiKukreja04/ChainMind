import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, Building2, MapPin, Save, Globe } from 'lucide-react';

export default function VendorProfile() {
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
            <span className="text-3xl font-bold text-secondary-foreground">MS</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">MediSupply Co</h2>
          <p className="text-muted-foreground">Premium Vendor</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <span className="text-warning">★</span>
            <span className="font-medium text-foreground">94%</span>
            <span className="text-sm text-muted-foreground">reliability</span>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Partner since Jan 2022</p>
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
                <Input id="companyName" defaultValue="MediSupply Co" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Person</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="contactName" defaultValue="Michael Brown" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" defaultValue="orders@medisupply.com" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" defaultValue="+1 555-0101" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="address" defaultValue="123 Supply Street, Chicago, IL" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="website" defaultValue="www.medisupply.com" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Company Description</Label>
              <Textarea 
                id="description" 
                defaultValue="Leading pharmaceutical distributor specializing in generic and branded medications. We serve pharmacies across the Midwest with reliable same-week delivery."
                rows={4}
              />
            </div>
          </div>
          <Button className="mt-6">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
