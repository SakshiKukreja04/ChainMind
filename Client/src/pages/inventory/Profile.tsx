import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Building2, Save } from 'lucide-react';

export default function Profile() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your personal information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card-dashboard text-center">
          <div className="h-24 w-24 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-foreground">SJ</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Sarah Johnson</h2>
          <p className="text-muted-foreground">Inventory Manager</p>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Member since Jan 2024</p>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="card-dashboard lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-6">Edit Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="firstName" defaultValue="Sarah" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="lastName" defaultValue="Johnson" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" defaultValue="sarah@company.com" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" defaultValue="+1 555-0123" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="department">Department</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="department" defaultValue="Inventory Management" className="pl-10" />
              </div>
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
