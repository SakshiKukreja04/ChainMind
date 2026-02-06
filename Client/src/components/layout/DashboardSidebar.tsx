import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BarChart3, 
  Brain, 
  CheckSquare, 
  Link2, 
  FileText, 
  Settings,
  Package,
  ShoppingCart,
  Users,
  Bell,
  Lightbulb,
  User,
  Truck,
  BookOpen,
  Award,
  Boxes,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { UserRole } from '@/types';
import { useState } from 'react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const smeOwnerMenu: SidebarItem[] = [
  { name: 'Dashboard', path: '/sme/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', path: '/sme/analytics', icon: BarChart3 },
  { name: 'AI Insights', path: '/sme/ai-insights', icon: Brain },
  { name: 'Approvals', path: '/sme/approvals', icon: CheckSquare },
  { name: 'Blockchain Audit', path: '/sme/blockchain', icon: Link2 },
  { name: 'Reports', path: '/sme/reports', icon: FileText },
  { name: 'Settings', path: '/sme/settings', icon: Settings },
];

const inventoryManagerMenu: SidebarItem[] = [
  { name: 'Dashboard', path: '/inventory/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', path: '/inventory/products', icon: Package },
  { name: 'Orders', path: '/inventory/orders', icon: ShoppingCart },
  { name: 'Vendors', path: '/inventory/vendors', icon: Users },
  { name: 'Alerts', path: '/inventory/alerts', icon: Bell },
  { name: 'AI Suggestions', path: '/inventory/ai-suggestions', icon: Lightbulb },
  { name: 'Reports', path: '/inventory/reports', icon: FileText },
  { name: 'Profile', path: '/inventory/profile', icon: User },
];

const vendorMenu: SidebarItem[] = [
  { name: 'Orders', path: '/vendor/orders', icon: ShoppingCart },
  { name: 'Delivery Status', path: '/vendor/delivery', icon: Truck },
  { name: 'Product Catalog', path: '/vendor/catalog', icon: BookOpen },
  { name: 'Performance Score', path: '/vendor/performance', icon: Award },
  { name: 'Blockchain Log', path: '/vendor/blockchain', icon: Link2 },
  { name: 'Profile', path: '/vendor/profile', icon: User },
];

const menuByRole: Record<UserRole, SidebarItem[]> = {
  'sme-owner': smeOwnerMenu,
  'inventory-manager': inventoryManagerMenu,
  'vendor': vendorMenu,
};

interface DashboardSidebarProps {
  role: UserRole;
  userName: string;
}

export function DashboardSidebar({ role, userName }: DashboardSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const menu = menuByRole[role];

  const roleLabels: Record<UserRole, string> = {
    'sme-owner': 'SME Owner',
    'inventory-manager': 'Inventory Manager',
    'vendor': 'Vendor',
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent">
            <Boxes className="h-5 w-5 text-sidebar-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">ChainMind</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-sidebar-border">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
          <p className="text-xs text-sidebar-muted">{roleLabels[role]}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
        <ul className="space-y-1">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "sidebar-item",
                    isActive && "sidebar-item-active",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-border">
        <Link
          to="/"
          className={cn(
            "sidebar-item text-sidebar-foreground/70 hover:text-sidebar-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Link>
      </div>
    </aside>
  );
}
