import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Bell, Shield, Users, Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    businessName: 'HealthPlus Pharmacy',
    industry: 'pharmacy',
    location: 'New York, USA',
    currency: 'USD',
    stockAlertPreference: 'medium',
    aiAssistedReorder: true,
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: true,
    lowStockAlerts: true,
    deliveryAlerts: true,
    approvalReminders: true,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your business and account preferences.</p>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <div className="card-dashboard">
            <h2 className="text-lg font-semibold text-foreground mb-6">Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={settings.industry}
                  onValueChange={(value) => setSettings({ ...settings, industry: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="fmcg">FMCG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={settings.location}
                  onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value) => setSettings({ ...settings, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockAlert">Stock Alert Level</Label>
                <Select
                  value={settings.stockAlertPreference}
                  onValueChange={(value) => setSettings({ ...settings, stockAlertPreference: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="aiReorder" className="font-medium">AI-Assisted Reordering</Label>
                  <p className="text-sm text-muted-foreground">
                    Let AI suggest optimal reorder points
                  </p>
                </div>
                <Switch
                  id="aiReorder"
                  checked={settings.aiAssistedReorder}
                  onCheckedChange={(checked) => setSettings({ ...settings, aiAssistedReorder: checked })}
                />
              </div>
            </div>
            <Button className="mt-6">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="card-dashboard">
            <h2 className="text-lg font-semibold text-foreground mb-6">Notification Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Real-time browser notifications</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">Weekly Digest</p>
                  <p className="text-sm text-muted-foreground">Summary email every Monday</p>
                </div>
                <Switch
                  checked={settings.weeklyDigest}
                  onCheckedChange={(checked) => setSettings({ ...settings, weeklyDigest: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">Alert when stock falls below threshold</p>
                </div>
                <Switch
                  checked={settings.lowStockAlerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, lowStockAlerts: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">Delivery Alerts</p>
                  <p className="text-sm text-muted-foreground">Updates on order deliveries</p>
                </div>
                <Switch
                  checked={settings.deliveryAlerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, deliveryAlerts: checked })}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="card-dashboard">
            <h2 className="text-lg font-semibold text-foreground mb-6">Security Settings</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" placeholder="••••••••" />
              </div>
              <Button>Update Password</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="card-dashboard">
            <h2 className="text-lg font-semibold text-foreground mb-6">Team Management</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">JS</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">John Smith</p>
                    <p className="text-sm text-muted-foreground">john@company.com • SME Owner</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium">Admin</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-medium text-secondary-foreground">SJ</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Sarah Johnson</p>
                    <p className="text-sm text-muted-foreground">sarah@company.com • Inventory Manager</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-medium">Member</span>
              </div>
              <Button variant="outline">Invite Team Member</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
