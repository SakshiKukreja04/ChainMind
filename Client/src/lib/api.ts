/**
 * API utility for ChainMind frontend
 * Handles authentication and API requests
 */

// Use empty string for relative paths (goes through Vite proxy in dev)
// Or use VITE_API_URL for production
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Auth token management
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setUser = (user: object): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = (): void => {
  localStorage.removeItem('user');
};

export const logout = (): void => {
  removeToken();
  removeUser();
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Generic fetch wrapper with auth header
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

// Auth API
export interface SignUpData {
  name: string;
  email: string;
  password: string;
  role: 'OWNER' | 'MANAGER' | 'VENDOR';
  businessName?: string;
  industry?: string;
  location?: string;
  currency?: string;
  businessId?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  mustChangePassword?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    businessId: string;
  };
}

export const authApi = {
  signup: (data: SignUpData): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: (data: LoginData): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  changePassword: (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    return apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  getProfile: (): Promise<{ success: boolean; user: AuthResponse['user'] }> => {
    return apiFetch('/api/auth/profile');
  },
};

// Team API
export interface InviteTeamMemberData {
  name: string;
  email: string;
  password: string;
  role: 'MANAGER' | 'VENDOR';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'VENDOR';
  createdAt: string;
}

export interface TeamMemberResponse {
  success: boolean;
  message: string;
  member: TeamMember;
}

export interface TeamListResponse {
  success: boolean;
  members: TeamMember[];
}

export const teamApi = {
  inviteMember: (data: InviteTeamMemberData): Promise<TeamMemberResponse> => {
    return apiFetch<TeamMemberResponse>('/api/auth/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getTeamMembers: (): Promise<TeamListResponse> => {
    return apiFetch<TeamListResponse>('/api/auth/team');
  },
};

// ── Inventory API ───────────────────────────────────────────────

export interface ProductPayload {
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  currentStock?: number;
  minThreshold?: number;
  vendorId?: string;
  description?: string;
}

export interface ProductResponse {
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
}

export interface ProductListResponse {
  success: boolean;
  count: number;
  products: ProductResponse[];
}

export interface SingleProductResponse {
  success: boolean;
  product: ProductResponse;
  message?: string;
}

export interface StockUpdateResponse {
  success: boolean;
  message: string;
  product: {
    id: string;
    name: string;
    currentStock: number;
    status: string;
    previousStock?: number;
  };
}

export const inventoryApi = {
  getProducts: (): Promise<ProductListResponse> => {
    return apiFetch<ProductListResponse>('/api/products');
  },

  getProduct: (id: string): Promise<SingleProductResponse> => {
    return apiFetch<SingleProductResponse>(`/api/products/${id}`);
  },

  addProduct: (data: ProductPayload): Promise<SingleProductResponse> => {
    return apiFetch<SingleProductResponse>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProduct: (id: string, data: Partial<ProductPayload>): Promise<SingleProductResponse> => {
    return apiFetch<SingleProductResponse>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateStock: (id: string, change: number): Promise<StockUpdateResponse> => {
    return apiFetch<StockUpdateResponse>(`/api/products/${id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ change }),
    });
  },

  correctStock: (id: string, actualStock: number, reason?: string): Promise<StockUpdateResponse> => {
    return apiFetch<StockUpdateResponse>(`/api/products/${id}/correct`, {
      method: 'PUT',
      body: JSON.stringify({ actualStock, reason }),
    });
  },

  assignVendor: (id: string, vendorId: string): Promise<SingleProductResponse> => {
    return apiFetch<SingleProductResponse>(`/api/products/${id}/assign-vendor`, {
      method: 'PUT',
      body: JSON.stringify({ vendorId }),
    });
  },

  deleteProduct: (id: string): Promise<{ success: boolean; message: string }> => {
    return apiFetch<{ success: boolean; message: string }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// ── Alert API ───────────────────────────────────────────────────

export interface AlertResponse {
  id: string;
  type: 'stock';
  title: string;
  message: string;
  severity: 'error' | 'warning';
  productId: string;
  productName: string;
  productSku: string;
  currentStock: number;
  minThreshold: number;
  read: boolean;
  createdAt: string;
}

export interface AlertListResponse {
  success: boolean;
  count: number;
  alerts: AlertResponse[];
}

export const alertApi = {
  getAlerts: (): Promise<AlertListResponse> => {
    return apiFetch<AlertListResponse>('/api/products/alerts/list');
  },

  markRead: (id: string): Promise<{ success: boolean; message: string }> => {
    return apiFetch<{ success: boolean; message: string }>(`/api/products/alerts/${id}/read`, {
      method: 'PUT',
    });
  },

  markAllRead: (): Promise<{ success: boolean; message: string }> => {
    return apiFetch<{ success: boolean; message: string }>('/api/products/alerts/read-all', {
      method: 'PUT',
    });
  },
};

// ── Vendor API ──────────────────────────────────────────────────

export interface VendorPayload {
  name: string;
  contact: string;
  email: string;
  leadTimeDays?: number;
  productsSupplied?: string[];
}

export interface VendorResponse {
  id: string;
  name: string;
  contact: string;
  email?: string;
  leadTimeDays: number;
  productsSupplied: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reliabilityScore: number;
  totalOrders?: number;
  paymentTerms?: string;
  rating?: number;
  isApproved?: boolean;
  submittedBy?: {
    id: string;
    name: string;
    email?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorListResponse {
  success: boolean;
  count: number;
  vendors: VendorResponse[];
}

export interface SingleVendorResponse {
  success: boolean;
  message?: string;
  vendor: VendorResponse;
}

export const vendorApi = {
  /** List all vendors (OWNER or MANAGER) — optional ?status=PENDING|APPROVED|REJECTED */
  getVendors: (status?: string): Promise<VendorListResponse> => {
    const qs = status ? `?status=${status}` : '';
    return apiFetch<VendorListResponse>(`/api/vendors${qs}`);
  },

  /** List pending vendors (OWNER only) */
  getPendingVendors: (): Promise<VendorListResponse> => {
    return apiFetch<VendorListResponse>('/api/vendors/pending');
  },

  /** Get single vendor */
  getVendor: (id: string): Promise<SingleVendorResponse> => {
    return apiFetch<SingleVendorResponse>(`/api/vendors/${id}`);
  },

  /** Submit new vendor request (MANAGER only) */
  submitVendor: (data: VendorPayload): Promise<SingleVendorResponse> => {
    return apiFetch<SingleVendorResponse>('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Approve a vendor (OWNER only) – credentials sent to vendor's stored email */
  approveVendor: (id: string): Promise<SingleVendorResponse> => {
    return apiFetch<SingleVendorResponse>(`/api/vendors/${id}/approve`, {
      method: 'PUT',
    });
  },

  /** Reject a vendor (OWNER only) */
  rejectVendor: (id: string, reason?: string): Promise<SingleVendorResponse> => {
    return apiFetch<SingleVendorResponse>(`/api/vendors/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },
};

// ── AI Demand Forecasting API ───────────────────────────────────

export interface DemandPrediction {
  predictedDailyDemand: number;
  daysToStockout: number;
  suggestedReorderQty: number;
  confidence: number;
  method: string;
  productId?: string;
  inferenceTimeMs?: number;
}

export interface PredictDemandPayload {
  productId?: string;
  salesHistory?: number[];
  currentStock?: number;
  leadTimeDays?: number;
}

export interface PredictDemandResponse {
  success: boolean;
  prediction: DemandPrediction;
  product?: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
  };
}

export interface RetrainResponse {
  success: boolean;
  message: string;
  metrics?: {
    mae: number;
    r2: number;
    model_path: string;
  };
}

export interface AIHealthResponse {
  success: boolean;
  ai: {
    success: boolean;
    service: string;
    status: string;
  };
}

export const aiApi = {
  /** Get demand prediction — pass productId OR full salesHistory payload */
  predictDemand: (data: PredictDemandPayload): Promise<PredictDemandResponse> => {
    return apiFetch<PredictDemandResponse>('/api/ai/predict-demand', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Trigger model retrain (OWNER only) */
  retrain: (): Promise<RetrainResponse> => {
    return apiFetch<RetrainResponse>('/api/ai/retrain', {
      method: 'POST',
    });
  },

  /** Check AI service health */
  health: (): Promise<AIHealthResponse> => {
    return apiFetch<AIHealthResponse>('/api/ai/health');
  },
};

// ── AI Suggestion API ───────────────────────────────────────────

export interface AiSuggestionResponse {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  currentStock: number;
  costPrice: number;
  sellingPrice: number;
  predictedDailyDemand: number;
  daysToStockout: number;
  suggestedReorderQty: number;
  confidence: number;
  method: string;
  inferenceTimeMs?: number;
  status: 'ACTIVE' | 'SUBMITTED' | 'EXPIRED';
  orderId?: string;
  createdBy?: { name: string; email: string };
  snapshot?: {
    productName: string;
    productSku: string;
    currentStock: number;
    costPrice: number;
    sellingPrice: number;
    leadTimeDays: number;
  };
  createdAt: string;
}

export interface AiSuggestionListResponse {
  success: boolean;
  count: number;
  suggestions: AiSuggestionResponse[];
}

export interface SingleAiSuggestionResponse {
  success: boolean;
  suggestion: AiSuggestionResponse;
}

export const suggestionApi = {
  /** Generate AI suggestion for a product (MANAGER) */
  generate: (productId: string): Promise<SingleAiSuggestionResponse> => {
    return apiFetch<SingleAiSuggestionResponse>(`/api/inventory/${productId}/ai-suggestion`, {
      method: 'POST',
    });
  },

  /** List all suggestions (OWNER|MANAGER), optional status filter */
  list: (status?: string): Promise<AiSuggestionListResponse> => {
    const qs = status ? `?status=${status}` : '';
    return apiFetch<AiSuggestionListResponse>(`/api/inventory/ai-suggestions${qs}`);
  },

  /** Get one suggestion */
  get: (id: string): Promise<SingleAiSuggestionResponse> => {
    return apiFetch<SingleAiSuggestionResponse>(`/api/inventory/ai-suggestions/${id}`);
  },
};

// ── Order API ───────────────────────────────────────────────────

export interface OrderResponse {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  vendorId?: string;
  vendorName: string;
  quantity: number;
  totalValue: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'CONFIRMED' | 'DISPATCHED' | 'IN_TRANSIT' | 'REJECTED' | 'DELIVERED' | 'VENDOR_REJECTED' | 'DELAY_REQUESTED';
  aiRecommendation?: {
    forecastedDemand: number;
    recommendedQuantity: number;
    confidence: number;
    reasoning: string;
  };
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  confirmedAt?: string;
  dispatchedAt?: string;
  inTransitAt?: string;
  rejectionReason?: string;
  delayReason?: string;
  newExpectedDate?: string;
  vendorAction?: 'ACCEPT' | 'REJECT' | 'REQUEST_DELAY';
  notes?: string;
  createdBy?: { name: string; email: string };
  approvedBy?: { name: string; email: string };
  createdAt: string;
  updatedAt?: string;
}

export interface OrderListResponse {
  success: boolean;
  count: number;
  orders: OrderResponse[];
}

export interface SingleOrderResponse {
  success: boolean;
  message?: string;
  order: OrderResponse;
}

export interface AiReorderPayload {
  productId: string;
  aiSuggestionId: string;
  finalQuantity: number;
  vendorId: string;
}

export const orderApi = {
  /** Submit AI-based reorder (MANAGER) */
  submitAiReorder: (data: AiReorderPayload): Promise<SingleOrderResponse> => {
    return apiFetch<SingleOrderResponse>('/api/orders/ai-reorder', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** List all orders (OWNER|MANAGER), optional status filter */
  list: (status?: string): Promise<OrderListResponse> => {
    const qs = status ? `?status=${status}` : '';
    return apiFetch<OrderListResponse>(`/api/orders${qs}`);
  },

  /** List pending orders (OWNER) */
  pending: (): Promise<OrderListResponse> => {
    return apiFetch<OrderListResponse>('/api/orders/pending');
  },

  /** Approve order (OWNER) */
  approve: (id: string): Promise<SingleOrderResponse> => {
    return apiFetch<SingleOrderResponse>(`/api/orders/${id}/approve`, {
      method: 'POST',
    });
  },

  /** Reject order (OWNER) */
  reject: (id: string, reason?: string): Promise<SingleOrderResponse> => {
    return apiFetch<SingleOrderResponse>(`/api/orders/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /** List vendor orders (VENDOR) */
  vendorOrders: (status?: string): Promise<OrderListResponse> => {
    const qs = status ? `?status=${status}` : '';
    return apiFetch<OrderListResponse>(`/api/orders/vendor${qs}`);
  },

  /** Vendor confirms an approved order (VENDOR) */
  confirm: (id: string): Promise<SingleOrderResponse> => {
    return apiFetch<SingleOrderResponse>(`/api/orders/${id}/confirm`, {
      method: 'POST',
    });
  },

  /** Vendor dispatches a confirmed order (VENDOR) */
  dispatch: (id: string): Promise<SingleOrderResponse> => {
    return apiFetch<SingleOrderResponse>(`/api/orders/${id}/dispatch`, {
      method: 'POST',
    });
  },

  /** Owner marks dispatched order as received (OWNER) */
  markReceived: (id: string): Promise<SingleOrderResponse> => {
    return apiFetch<SingleOrderResponse>(`/api/orders/${id}/received`, {
      method: 'POST',
    });
  },

  /** Vendor action on approved order: ACCEPT / REJECT / REQUEST_DELAY */
  vendorAction: (
    id: string,
    action: 'ACCEPT' | 'REJECT' | 'REQUEST_DELAY',
    reason?: string,
    newExpectedDate?: string,
  ): Promise<SingleOrderResponse> => {
    return apiFetch<SingleOrderResponse>(`/api/orders/${id}/vendor-action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason, newExpectedDate }),
    });
  },

  /** Vendor updates delivery status: DISPATCHED → IN_TRANSIT → DELIVERED */
  updateDeliveryStatus: (
    id: string,
    deliveryStatus: 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED',
  ): Promise<SingleOrderResponse> => {
    return apiFetch<SingleOrderResponse>(`/api/orders/${id}/delivery-status`, {
      method: 'PATCH',
      body: JSON.stringify({ deliveryStatus }),
    });
  },

  /** Get vendor performance metrics (VENDOR) */
  vendorPerformance: (): Promise<VendorPerformanceResponse> => {
    return apiFetch<VendorPerformanceResponse>('/api/orders/vendor/performance');
  },
};

export interface VendorPerformanceResponse {
  success: boolean;
  vendor: {
    id: string;
    name: string;
    reliabilityScore: number;
    totalOrders: number;
    rating: number;
    performanceMetrics: {
      onTimeDeliveryRate?: number;
      qualityScore?: number;
      responseFintRate?: number;
    };
    orderBreakdown: {
      approved: number;
      confirmed: number;
      dispatched: number;
      inTransit: number;
      delivered: number;
      rejected: number;
    };
  };
}

export default apiFetch;

// ── Vendor Product Catalog API ──────────────────────────────────

export interface VendorProductPayload {
  name: string;
  sku: string;
  category?: string;
  unitPrice: number;
  minOrderQty?: number;
  leadTimeDays?: number;
}

export interface VendorProductResponse {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  minOrderQty: number;
  leadTimeDays: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorProductListResponse {
  success: boolean;
  count: number;
  products: VendorProductResponse[];
}

export interface SingleVendorProductResponse {
  success: boolean;
  message?: string;
  product: VendorProductResponse;
}

export const vendorProductApi = {
  /** List catalog products (VENDOR sees own, OWNER/MANAGER sees all) */
  list: (vendorId?: string): Promise<VendorProductListResponse> => {
    const qs = vendorId ? `?vendorId=${vendorId}` : '';
    return apiFetch<VendorProductListResponse>(`/api/vendor/products${qs}`);
  },

  /** Create catalog product (VENDOR only) */
  create: (data: VendorProductPayload): Promise<SingleVendorProductResponse> => {
    return apiFetch<SingleVendorProductResponse>('/api/vendor/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Update catalog product (VENDOR only) */
  update: (id: string, data: Partial<VendorProductPayload>): Promise<SingleVendorProductResponse> => {
    return apiFetch<SingleVendorProductResponse>(`/api/vendor/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /** Toggle active/inactive (VENDOR only) */
  toggleStatus: (id: string, isActive?: boolean): Promise<SingleVendorProductResponse> => {
    return apiFetch<SingleVendorProductResponse>(`/api/vendor/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(isActive != null ? { isActive } : {}),
    });
  },
};

// ── Audit Trail API ─────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  orderId: string;
  action: string;
  dataHash: string;
  previousHash: string | null;
  status: 'VERIFIED' | 'PENDING';
  timestamp: string;
  createdBy: { name: string; email: string } | null;
  businessId: string;
}

export interface AuditLogListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  logs: AuditLogEntry[];
}

export interface AuditVerifyResponse {
  success: boolean;
  orderId: string;
  chainValid: boolean;
  entries: {
    id: string;
    action: string;
    timestamp: string;
    dataHash: string;
    previousHash: string | null;
    status: 'VERIFIED' | 'PENDING';
    recomputedHash: string;
    hashMatch: boolean;
    prevMatch: boolean;
  }[];
}

export const auditApi = {
  /** List audit logs for the current business */
  list: (params?: { orderId?: string; limit?: number; page?: number }): Promise<AuditLogListResponse> => {
    const qs = new URLSearchParams();
    if (params?.orderId) qs.set('orderId', params.orderId);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.page) qs.set('page', String(params.page));
    const query = qs.toString();
    return apiFetch<AuditLogListResponse>(`/api/audit/logs${query ? '?' + query : ''}`);
  },

  /** Get audit chain for a specific order */
  orderChain: (orderId: string): Promise<AuditLogListResponse> => {
    return apiFetch<AuditLogListResponse>(`/api/audit/logs/${orderId}`);
  },

  /** Verify full hash chain for an order */
  verifyOrder: (orderId: string): Promise<AuditVerifyResponse> => {
    return apiFetch<AuditVerifyResponse>(`/api/audit/verify/${orderId}`);
  },

  /** Verify a single audit entry */
  verifyEntry: (entryId: string): Promise<{ success: boolean; valid: boolean; status: string }> => {
    return apiFetch(`/api/audit/verify/entry/${entryId}`);
  },
};
