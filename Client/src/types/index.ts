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
  category: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minThreshold: number;
  vendorId: string | null;
  vendorName: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  // Kept for backward compat with any remaining mock references
  stock?: number;
  minStock?: number;
  price?: number;
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
  productId?: string;
  productName?: string;
  productSku?: string;
  currentStock?: number;
  minThreshold?: number;
  createdAt: string;
  read: boolean;
}

// ─── Cooperative Buying Types ─────────────────────────────────

export interface CooperativeParticipant {
  _id: string;
  businessId: {
    _id: string;
    businessName: string;
    location: string;
    industry?: string;
  };
  ownerId: {
    _id: string;
    name: string;
    email: string;
  };
  productId?: {
    _id: string;
    name: string;
    sku: string;
    currentStock: number;
    minThreshold: number;
    costPrice: number;
  };
  requestedQty: number;
  approved: boolean;
  approvedAt: string | null;
}

export interface CooperativeVendorSuggestion {
  vendorId: string;
  vendorProductId: string;
  vendorName: string;
  unitPrice: number;
  bulkPrice: number;
  minOrderQty: number;
  leadTimeDays: number;
}

export interface CooperativeBuy {
  _id: string;
  productSpecHash: string;
  productName: string;
  category: string;
  unitSize: string | null;
  participants: CooperativeParticipant[];
  totalQuantity: number;
  estimatedSavingsPercent: number;
  status: 'PROPOSED' | 'APPROVED' | 'ORDERED' | 'DELIVERED' | 'CANCELLED';
  initiatedBy: {
    _id: string;
    name: string;
    email: string;
  };
  initiatedByBusiness: {
    _id: string;
    businessName: string;
    location: string;
    industry?: string;
  };
  selectedVendorId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    reliabilityScore?: number;
  } | null;
  selectedVendorProductId: string | null;
  orderId: string | null;
  vendorSuggestions: CooperativeVendorSuggestion[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CooperativeDiscoveryMatch {
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  needsReorder: boolean;
  businessId: string;
  businessName: string;
  location: string;
  industry: string;
}

export interface CooperativeDiscoveryResult {
  specHash: string;
  product: {
    id: string;
    name: string;
    category: string;
    currentStock: number;
    minThreshold: number;
    needsReorder: boolean;
  };
  matches: CooperativeDiscoveryMatch[];
  existingGroups: CooperativeBuy[];
  vendorOptions: CooperativeVendorSuggestion[];
}
