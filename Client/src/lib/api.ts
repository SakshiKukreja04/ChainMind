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
  leadTimeDays?: number;
  productsSupplied?: string[];
}

export interface VendorResponse {
  id: string;
  name: string;
  contact: string;
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

  /** Approve a vendor (OWNER only) */
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

export default apiFetch;
