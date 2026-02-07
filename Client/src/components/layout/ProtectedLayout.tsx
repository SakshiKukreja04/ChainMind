import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSidebar } from './DashboardSidebar';
import type { UserRole } from '@/types';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NotificationPanel } from '@/components/NotificationPanel';

// Map backend roles to frontend UserRole type
const roleMap: Record<string, UserRole> = {
  'OWNER': 'sme-owner',
  'MANAGER': 'inventory-manager',
  'VENDOR': 'vendor',
};

// Map roles to their allowed route prefixes
const roleRoutes: Record<string, string> = {
  'OWNER': '/sme',
  'MANAGER': '/inventory',
  'VENDOR': '/vendor',
};

// Map roles to their default dashboard
const roleDefaultDashboard: Record<string, string> = {
  'OWNER': '/sme/dashboard',
  'MANAGER': '/inventory/dashboard',
  'VENDOR': '/vendor/orders',
};

interface ProtectedLayoutProps {
  allowedRoles?: ('OWNER' | 'MANAGER' | 'VENDOR')[];
}

export function ProtectedLayout({ allowedRoles }: ProtectedLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has permission to access this route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's appropriate dashboard
    return <Navigate to={roleDefaultDashboard[user.role]} replace />;
  }

  const frontendRole = roleMap[user.role] || 'sme-owner';

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar role={frontendRole} userName={user.name} />
      
      <div className="pl-64 transition-all duration-300">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationPanel role={frontendRole as UserRole} />
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { roleDefaultDashboard };
