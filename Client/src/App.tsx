import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Layouts
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

// Public Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import NotFound from "@/pages/NotFound";

// SME Owner Pages
import SMEDashboard from "@/pages/sme/Dashboard";
import Analytics from "@/pages/sme/Analytics";
import AIInsights from "@/pages/sme/AIInsights";
import Approvals from "@/pages/sme/Approvals";
import BlockchainAudit from "@/pages/sme/Blockchain";
import SMEReports from "@/pages/sme/Reports";
import SMESettings from "@/pages/sme/Settings";

// Inventory Manager Pages
import InventoryDashboard from "@/pages/inventory/Dashboard";
import Products from "@/pages/inventory/Products";
import Orders from "@/pages/inventory/Orders";
import Vendors from "@/pages/inventory/Vendors";
import Alerts from "@/pages/inventory/Alerts";
import AISuggestions from "@/pages/inventory/AISuggestions";
import InventoryProfile from "@/pages/inventory/Profile";

// Vendor Pages
import VendorOrders from "@/pages/vendor/Orders";
import DeliveryStatus from "@/pages/vendor/Delivery";
import Catalog from "@/pages/vendor/Catalog";
import Performance from "@/pages/vendor/Performance";
import VendorBlockchain from "@/pages/vendor/Blockchain";
import VendorProfile from "@/pages/vendor/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
            </Route>

            {/* SME Owner Routes */}
            <Route element={<ProtectedLayout allowedRoles={['OWNER']} />}>
              <Route path="/sme/dashboard" element={<SMEDashboard />} />
              <Route path="/sme/analytics" element={<Analytics />} />
              <Route path="/sme/ai-insights" element={<AIInsights />} />
              <Route path="/sme/approvals" element={<Approvals />} />
              <Route path="/sme/blockchain" element={<BlockchainAudit />} />
              <Route path="/sme/reports" element={<SMEReports />} />
              <Route path="/sme/settings" element={<SMESettings />} />
            </Route>

            {/* Inventory Manager Routes */}
            <Route element={<ProtectedLayout allowedRoles={['MANAGER']} />}>
              <Route path="/inventory/dashboard" element={<InventoryDashboard />} />
              <Route path="/inventory/products" element={<Products />} />
              <Route path="/inventory/orders" element={<Orders />} />
              <Route path="/inventory/vendors" element={<Vendors />} />
              <Route path="/inventory/alerts" element={<Alerts />} />
              <Route path="/inventory/ai-suggestions" element={<AISuggestions />} />
              <Route path="/inventory/reports" element={<SMEReports />} />
              <Route path="/inventory/profile" element={<InventoryProfile />} />
            </Route>

            {/* Vendor Routes */}
            <Route element={<ProtectedLayout allowedRoles={['VENDOR']} />}>
              <Route path="/vendor/orders" element={<VendorOrders />} />
              <Route path="/vendor/delivery" element={<DeliveryStatus />} />
              <Route path="/vendor/catalog" element={<Catalog />} />
              <Route path="/vendor/performance" element={<Performance />} />
              <Route path="/vendor/blockchain" element={<VendorBlockchain />} />
              <Route path="/vendor/profile" element={<VendorProfile />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
