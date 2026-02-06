import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Building2, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.success && res.user) {
        setName(res.user.name || '');
        setEmail(res.user.email || '');
        setPhone(res.user.phone || '');
        setDepartment(res.user.department || '');
        setCreatedAt(res.user.createdAt || '');
      }
    } catch {
      // Fall back to auth context
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile({ name, phone, department });
      if (res.success) {
        toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
        // Update auth context so sidebar/header reflect new name
        if (user && res.user) {
          updateUser({ ...user, name: res.user.name });
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'MANAGER': return 'Inventory Manager';
      case 'OWNER': return 'SME Owner';
      case 'VENDOR': return 'Vendor';
      default: return role || 'User';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            <span className="text-3xl font-bold text-primary-foreground">
              {getInitials(name || 'U')}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">{name || 'User'}</h2>
          <p className="text-muted-foreground">{getRoleLabel(user?.role)}</p>
          {createdAt && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Member since {formatDate(createdAt)}</p>
            </div>
          )}
        </div>

        {/* Edit Profile */}
        <div className="card-dashboard lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-6">Edit Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="pl-10 opacity-60"
                />
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="department">Department</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Inventory Management"
                  className="pl-10"
                />
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
