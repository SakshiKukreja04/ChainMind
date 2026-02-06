export type UserRole = 'sme-owner' | 'inventory-manager' | 'vendor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Business {
  id: string;
  name: string;
  industry: 'pharmacy' | 'retail' | 'fmcg';
  location: string;
  currency: string;
  stockAlertPreference: 'low' | 'medium' | 'high';
  aiAssistedReorder: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  vendorId: string;
  vendorName: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  price: number;
  category: string;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  reliabilityScore: number;
  leadTime: number;
  status: 'active' | 'inactive' | 'pending';
  productsCount: number;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'dispatched' | 'in-transit' | 'delivered';
  createdAt: string;
  estimatedDelivery: string;
  totalAmount: number;
}

export interface Approval {
  id: string;
  type: 'reorder' | 'vendor-onboarding' | 'cooperative-buy';
  title: string;
  description: string;
  costImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
  requestedBy: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface BlockchainRecord {
  id: string;
  orderId: string;
  hash: string;
  timestamp: string;
  status: 'verified' | 'pending' | 'failed';
  action: string;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'risk';
  title: string;
  description: string;
  impact: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Alert {
  id: string;
  type: 'stock' | 'delivery' | 'vendor' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
}
