import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import type { UserRole } from '@/types';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NotificationPanel } from '@/components/NotificationPanel';

interface DashboardLayoutProps {
  role: UserRole;
  userName: string;
}

export function DashboardLayout({ role, userName }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar role={role} userName={userName} />
      
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
              <NotificationPanel role={role} />
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {userName.charAt(0).toUpperCase()}
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
