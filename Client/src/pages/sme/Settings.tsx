import { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Building2, Bell, Shield, Users, Save, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { teamApi, ownerApi, TeamMember } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MANAGER' as 'MANAGER' | 'VENDOR',
  });
  const [settings, setSettings] = useState({
    businessName: '',
    industry: '',
    location: '',
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

  // Fetch business info + team members on mount
  useEffect(() => {
    fetchTeamMembers();
    loadBusinessSettings();
  }, []);

  const loadBusinessSettings = async () => {
    try {
      const res = await ownerApi.summary();
      setSettings((prev) => ({
        ...prev,
        businessName: res.businessName || '',
        industry: res.industry || '',
        location: res.location || '',
        currency: res.currency || 'USD',
      }));
    } catch (err) {
      console.error('Failed to load business settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await ownerApi.updateSettings({
        businessName: settings.businessName,
        industry: settings.industry,
        location: settings.location,
        currency: settings.currency,
      });
      toast({ title: 'Settings saved', description: 'Your business settings have been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to save settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setIsLoadingTeam(true);
      const response = await teamApi.getTeamMembers();
      setTeamMembers(response.members);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteForm.name || !inviteForm.email || !inviteForm.password) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await teamApi.inviteMember(inviteForm);
      
      toast({
        title: 'Success!',
        description: `${inviteForm.name} has been invited as ${inviteForm.role === 'MANAGER' ? 'Inventory Manager' : 'Vendor'}`,
      });

      // Refresh team list
      fetchTeamMembers();
      
      // Reset form and close dialog
      setInviteForm({ name: '', email: '', password: '', role: 'MANAGER' });
      setIsInviteOpen(false);
    } catch (error) {
      toast({
        title: 'Invite Failed',
        description: error instanceof Error ? error.message : 'Failed to invite team member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER': return 'SME Owner';
      case 'MANAGER': return 'Inventory Manager';
      case 'VENDOR': return 'Vendor';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-primary/10 text-primary';
      case 'MANAGER': return 'bg-blue-500/10 text-blue-600';
      case 'VENDOR': return 'bg-green-500/10 text-green-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
            <Button className="mt-6" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Team Management</h2>
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4" />
                    Invite Team Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Add a new team member to your business. They will be able to log in with the credentials you set.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-name">Full Name</Label>
                      <Input
                        id="invite-name"
                        placeholder="Enter team member's name"
                        value={inviteForm.name}
                        onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="member@company.com"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-password">Temporary Password</Label>
                      <Input
                        id="invite-password"
                        type="text"
                        placeholder="Set a temporary password"
                        value={inviteForm.password}
                        onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <Select
                        value={inviteForm.role}
                        onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as 'MANAGER' | 'VENDOR' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGER">Inventory Manager</SelectItem>
                          <SelectItem value="VENDOR">Vendor</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {inviteForm.role === 'MANAGER'
                          ? 'Can manage inventory, orders, vendors, and view alerts'
                          : 'Can view orders, manage deliveries, and update product catalog'}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInviteOpen(false)} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button onClick={handleInviteMember} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Create Member
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {isLoadingTeam ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No team members yet. Invite your first team member!</p>
                </div>
              ) : (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-foreground">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.email} &bull; {getRoleLabel(member.role)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${getRoleBadgeStyle(member.role)}`}>
                      {member.role === 'OWNER' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
