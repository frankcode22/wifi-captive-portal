// ============================================
// API SERVICE - Enhanced Version with Complete Voucher Support
// Centralized API Service for WiFi Billing Portal
// ============================================

import type {
  ApiResponse,
  PaginatedResponse,
  Package,
  CreatePackageRequest,
  UpdatePackageRequest,
  User,
  OnlineUser,
  CreateUserRequest,
  Transaction,
  CreateTransactionRequest,
  ActivateSubscriptionRequest,
  Subscription,
  Router,
  SummaryMetrics,
  RevenueDataPoint,
  PaymentMethodBreakdown,
  PendingPayment,
  Alert,
  Voucher,
  CreateVoucherRequest,
  UpdateVoucherRequest,
  SearchParams,
} from '../types/types';

// ============================================
// CONFIGURATION
// ============================================

//const API_BASE_URL =  'http://localhost:3000/api';
// const API_BASE_URL =  'http://192.168.91.195:3000/api';
const API_TIMEOUT = 30000; // 30 seconds



const API_BASE_URL = (() => {
  const host = window.location.hostname;
  
  // Local development
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  
  // Vercel production - use dedicated backend subdomain
  if (host === 'captive.ashvillecomsolutions.co.ke') {
    return 'https://backend.ashvillecomsolutions.co.ke/api';
  }
  
  // Vercel preview deployments
  if (host.includes('.vercel.app')) {
    return 'https://backend.ashvillecomsolutions.co.ke/api';
  }
  
  // Fallback
  return 'https://backend.ashvillecomsolutions.co.ke/api';
})();
// ============================================
// ERROR HANDLING
// ============================================

class ApiError extends Error {
  statusCode?: number;
  data?: any;

  constructor(message: string, statusCode?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

// ============================================
// CORE HTTP CLIENT
// ============================================

/**
 * Generic API call wrapper with error handling and timeout
 */
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeout = API_TIMEOUT
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP Error: ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('API Call Error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timeout - please try again',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
}

/**
 * Enhanced fetch with timeout and better error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }
    throw error;
  }
}

/**
 * Handle response and extract data or throw error
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    const errorData = isJson ? await response.json() : { error: response.statusText };
    throw new ApiError(
      errorData.error || errorData.message || 'An error occurred',
      response.status,
      errorData
    );
  }

  if (isJson) {
    return response.json();
  }

  return response.text() as any;
}

// ============================================
// PACKAGE API
// ============================================

export const packageApi = {
  /**
   * Get all active packages
   */
  getAll: async (): Promise<ApiResponse<Package[]>> => {
    return apiCall('/packages');
  },

  /**
   * Get all packages (admin version with stats)
   */
  getAllWithStats: async (): Promise<Package[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/packages`);
    const data = await handleResponse<ApiResponse<Package[]>>(response);
    return data.data || [];
  },

  /**
   * Get package by ID
   */
  getById: async (packageId: string): Promise<ApiResponse<Package>> => {
    return apiCall(`/packages/${packageId}`);
  },

  /**
   * Get package by ID (strict version that throws on error)
   */
  getByIdStrict: async (packageId: string): Promise<Package> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/packages/${packageId}`);
    const data = await handleResponse<ApiResponse<Package>>(response);
    if (!data.data) {
      throw new ApiError('Package not found', 404);
    }
    return data.data;
  },

  /**
   * Create new package
   */
  create: async (packageData: CreatePackageRequest): Promise<Package> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/packages`, {
      method: 'POST',
      body: JSON.stringify(packageData),
    });
    const data = await handleResponse<ApiResponse<Package>>(response);
    if (!data.data) {
      throw new ApiError('Failed to create package');
    }
    return data.data;
  },

  /**
   * Update package
   */
  update: async (packageId: string, packageData: Partial<UpdatePackageRequest>): Promise<Package> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/packages/${packageId}`, {
      method: 'PUT',
      body: JSON.stringify(packageData),
    });
    const data = await handleResponse<ApiResponse<Package>>(response);
    if (!data.data) {
      throw new ApiError('Failed to update package');
    }
    return data.data;
  },

  /**
   * Delete package
   */
  delete: async (packageId: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/packages/${packageId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Toggle package active status
   */
  toggleActive: async (packageId: string, isActive: boolean): Promise<Package> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/packages/${packageId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
    const data = await handleResponse<ApiResponse<Package>>(response);
    if (!data.data) {
      throw new ApiError('Failed to update package status');
    }
    return data.data;
  },

  /**
   * Get package statistics
   */
  getStats: async (packageId: string): Promise<{ activeUsers: number; totalRevenue: number }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/packages/${packageId}/stats`);
    const data = await handleResponse<ApiResponse<any>>(response);
    return data.data || { activeUsers: 0, totalRevenue: 0 };
  },
};

// ============================================
// VOUCHER API - COMPLETE
// ============================================

export const voucherApi = {
  /**
   * Get all vouchers with optional filtering
   */
  getAll: async (params?: SearchParams & { type?: string; isActive?: boolean }): Promise<Voucher[]> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.query) queryParams.append('search', params.query);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/vouchers?${queryParams.toString()}`
    );
    const data = await handleResponse<ApiResponse<Voucher[]> | PaginatedResponse<Voucher>>(response);
    
    if ('data' in data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  /**
   * Create voucher(s)
   */
  create: async (voucherData: CreateVoucherRequest): Promise<Voucher[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/vouchers`, {
      method: 'POST',
      body: JSON.stringify(voucherData),
    });
    const data = await handleResponse<ApiResponse<Voucher[]>>(response);
    return data.data || [];
  },

  /**
   * Get voucher by code
   */
  getByCode: async (code: string): Promise<Voucher> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/vouchers/${code}`);
    const data = await handleResponse<ApiResponse<Voucher>>(response);
    if (!data.data) {
      throw new ApiError('Voucher not found', 404);
    }
    return data.data;
  },

  /**
   * Update voucher
   */
  update: async (code: string, voucherData: Partial<UpdateVoucherRequest>): Promise<Voucher> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/vouchers/${code}`, {
      method: 'PUT',
      body: JSON.stringify(voucherData),
    });
    const data = await handleResponse<ApiResponse<Voucher>>(response);
    if (!data.data) {
      throw new ApiError('Failed to update voucher');
    }
    return data.data;
  },

  /**
   * Delete voucher
   */
  delete: async (code: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/vouchers/${code}`, {
      method: 'DELETE',
    });
  },

  /**
   * Toggle voucher active status
   */
  toggleActive: async (code: string, isActive: boolean): Promise<Voucher> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/vouchers/${code}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
    const data = await handleResponse<ApiResponse<Voucher>>(response);
    if (!data.data) {
      throw new ApiError('Failed to update voucher status');
    }
    return data.data;
  },

  /**
   * Validate voucher before redemption
   */
  validate: async (code: string, userId?: string, packageId?: string): Promise<{ valid: boolean; voucher?: Voucher; errors?: string[] }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/vouchers/${code}/validate`, {
      method: 'POST',
      body: JSON.stringify({ userId, packageId }),
    });
    const data = await handleResponse<ApiResponse<any>>(response);
    return data.data || data;
  },

  /**
   * Redeem voucher
   */
  redeem: async (code: string, userId: string, packageId?: string): Promise<Subscription> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/vouchers/${code}/redeem`, {
      method: 'POST',
      body: JSON.stringify({ userId, packageId }),
    });
    const data = await handleResponse<ApiResponse<Subscription>>(response);
    if (!data.data) {
      throw new ApiError('Failed to redeem voucher');
    }
    return data.data;
  },
};

// ============================================
// PAYMENT API
// ============================================

export const paymentApi = {
  /**
   * Initiate payment
   */
  initiate: async (data: {
    macAddress: string;
    phoneNumber: string;
    package: string;
    paymentMethod: 'mpesa' | 'pesapal';
  }): Promise<ApiResponse<any>> => {
    return apiCall('/payment/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get payment status
   */
  getStatus: async (sessionId: string): Promise<ApiResponse<any>> => {
    return apiCall(`/payment/status/${sessionId}`);
  },

  /**
   * Get payment by transaction reference
   */
  getByTransactionRef: async (transactionRef: string): Promise<Transaction> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/payment/transaction/${transactionRef}`);
    const data = await handleResponse<ApiResponse<Transaction>>(response);
    if (!data.data) {
      throw new ApiError('Transaction not found', 404);
    }
    return data.data;
  },
};

// ============================================
// SESSION API
// ============================================

export const sessionApi = {
  /**
   * Get session details
   */
  get: async (sessionId: string): Promise<ApiResponse<any>> => {
    return apiCall(`/sessions/${sessionId}`);
  },

  /**
   * Get active sessions
   */
  getActive: async (page: number = 1, limit: number = 20): Promise<ApiResponse<any>> => {
    return apiCall(`/sessions?page=${page}&limit=${limit}`);
  },

  /**
   * Get user session history
   */
  getUserSessions: async (phoneNumber: string, page: number = 1, limit: number = 10): Promise<ApiResponse<any>> => {
    return apiCall(`/sessions/user/${phoneNumber}?page=${page}&limit=${limit}`);
  },
};

// ============================================
// USER API
// ============================================

export const userApi = {
  /**
   * Get all users
   */
  getAll: async (params?: SearchParams): Promise<User[]> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.query) queryParams.append('search', params.query);

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/users?${queryParams.toString()}`
    );
    const data = await handleResponse<ApiResponse<User[]> | PaginatedResponse<User>>(response);
    
    if ('data' in data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  /**
   * Get online users
   */
  getOnline: async (): Promise<OnlineUser[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/users/online`);
    const data = await handleResponse<ApiResponse<OnlineUser[]>>(response);
    return data.data || [];
  },

  /**
   * Get user by ID
   */
  getById: async (userId: string): Promise<User> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/users/${userId}`);
    const data = await handleResponse<ApiResponse<User>>(response);
    if (!data.data) {
      throw new ApiError('User not found', 404);
    }
    return data.data;
  },

  /**
   * Create new user
   */
  create: async (userData: CreateUserRequest): Promise<User> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/users`, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    const data = await handleResponse<ApiResponse<User>>(response);
    if (!data.data) {
      throw new ApiError('Failed to create user');
    }
    return data.data;
  },

  /**
   * Disconnect user
   */
  disconnect: async (userId: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/users/${userId}/disconnect`, {
      method: 'POST',
    });
  },

  /**
   * Suspend user
   */
  suspend: async (userId: string, reason?: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Unsuspend user
   */
  unsuspend: async (userId: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/users/${userId}/unsuspend`, {
      method: 'POST',
    });
  },
};

// ============================================
// TRANSACTION API
// ============================================

export const transactionApi = {
  /**
   * Get all transactions
   */
  getAll: async (params?: SearchParams): Promise<Transaction[]> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.query) queryParams.append('search', params.query);

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/transactions?${queryParams.toString()}`
    );
    const data = await handleResponse<ApiResponse<Transaction[]> | PaginatedResponse<Transaction>>(
      response
    );

    if ('data' in data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  /**
   * Get pending payments
   */
  getPending: async (): Promise<PendingPayment[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/pending`);
    const data = await handleResponse<ApiResponse<PendingPayment[]>>(response);
    return data.data || [];
  },

  /**
   * Get transaction by ID
   */
  getById: async (transactionId: string): Promise<Transaction> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/${transactionId}`);
    const data = await handleResponse<ApiResponse<Transaction>>(response);
    if (!data.data) {
      throw new ApiError('Transaction not found', 404);
    }
    return data.data;
  },

  /**
   * Create transaction
   */
  create: async (transactionData: CreateTransactionRequest): Promise<Transaction> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
    const data = await handleResponse<ApiResponse<Transaction>>(response);
    if (!data.data) {
      throw new ApiError('Failed to create transaction');
    }
    return data.data;
  },

  /**
   * Activate subscription from payment
   */
  activateSubscription: async (activationData: ActivateSubscriptionRequest): Promise<Subscription> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/activate`, {
      method: 'POST',
      body: JSON.stringify(activationData),
    });
    const data = await handleResponse<ApiResponse<Subscription>>(response);
    if (!data.data) {
      throw new ApiError('Failed to activate subscription');
    }
    return data.data;
  },
};

// ============================================
// SUBSCRIPTION API
// ============================================

export const subscriptionApi = {
  /**
   * Get user subscriptions
   */
  getByUser: async (userId: string): Promise<Subscription[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/user/${userId}`);
    const data = await handleResponse<ApiResponse<Subscription[]>>(response);
    return data.data || [];
  },

  /**
   * Get active subscriptions
   */
  getActive: async (): Promise<Subscription[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/active`);
    const data = await handleResponse<ApiResponse<Subscription[]>>(response);
    return data.data || [];
  },

  /**
   * Cancel subscription
   */
  cancel: async (subscriptionId: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    });
  },

  /**
   * Toggle auto-renewal
   */
  toggleAutoRenewal: async (subscriptionId: string, autoRenewal: boolean): Promise<Subscription> => {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/subscriptions/${subscriptionId}/auto-renewal`,
      {
        method: 'PUT',
        body: JSON.stringify({ autoRenewal }),
      }
    );
    const data = await handleResponse<ApiResponse<Subscription>>(response);
    if (!data.data) {
      throw new ApiError('Failed to update auto-renewal');
    }
    return data.data;
  },
};

// ============================================
// ANALYTICS API
// ============================================

export const analyticsApi = {
  /**
   * Get dashboard overview
   */
  getDashboard: async (): Promise<ApiResponse<any>> => {
    return apiCall('/analytics/dashboard');
  },

  /**
   * Get revenue stats
   */
  getRevenue: async (startDate?: string, endDate?: string): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiCall(`/analytics/revenue?${params.toString()}`);
  },

  /**
   * Get summary metrics
   */
  getSummary: async (timeRange?: string): Promise<SummaryMetrics> => {
    const queryParams = timeRange ? `?range=${timeRange}` : '';
    const response = await fetchWithTimeout(`${API_BASE_URL}/analytics/summary${queryParams}`);
    const data = await handleResponse<ApiResponse<SummaryMetrics>>(response);
    if (!data.data) {
      throw new ApiError('Failed to fetch metrics');
    }
    return data.data;
  },

  /**
   * Get revenue data points
   */
  getRevenueData: async (days = 30): Promise<RevenueDataPoint[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/analytics/revenue-data?days=${days}`);
    const data = await handleResponse<ApiResponse<RevenueDataPoint[]>>(response);
    return data.data || [];
  },

  /**
   * Get payment method breakdown
   */
  getPaymentBreakdown: async (timeRange?: string): Promise<PaymentMethodBreakdown> => {
    const queryParams = timeRange ? `?range=${timeRange}` : '';
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/analytics/payment-breakdown${queryParams}`
    );
    const data = await handleResponse<ApiResponse<PaymentMethodBreakdown>>(response);
    return (
      data.data || {
        mpesa: 0,
        pesapal: 0,
        cash: 0,
        voucher: 0,
        card: 0,
        bank_transfer: 0,
      }
    );
  },
};

// ============================================
// ROUTER API
// ============================================

export const routerApi = {
  /**
   * Get all routers
   */
  getAll: async (): Promise<Router[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/routers`);
    const data = await handleResponse<ApiResponse<Router[]>>(response);
    return data.data || [];
  },

  /**
   * Get router by ID
   */
  getById: async (routerId: string): Promise<Router> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/routers/${routerId}`);
    const data = await handleResponse<ApiResponse<Router>>(response);
    if (!data.data) {
      throw new ApiError('Router not found', 404);
    }
    return data.data;
  },

  /**
   * Restart router
   */
  restart: async (routerId: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/routers/${routerId}/restart`, {
      method: 'POST',
    });
  },
};

// ============================================
// ALERT API
// ============================================

export const alertApi = {
  /**
   * Get all alerts
   */
  getAll: async (): Promise<Alert[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/alerts`);
    const data = await handleResponse<ApiResponse<Alert[]>>(response);
    return data.data || [];
  },

  /**
   * Mark alert as read
   */
  markAsRead: async (alertId: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/alerts/${alertId}/read`, {
      method: 'PUT',
    });
  },

  /**
   * Dismiss alert
   */
  dismiss: async (alertId: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/alerts/${alertId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// UNIFIED API EXPORT
// ============================================

/**
 * Main API object combining all services
 */
export const api = {
  // Original APIs (maintained for backward compatibility)
  package: packageApi,
  payment: paymentApi,
  session: sessionApi,
  analytics: analyticsApi,
  
  // New Admin Dashboard APIs
  packages: packageApi,
  users: userApi,
  transactions: transactionApi,
  subscriptions: subscriptionApi,
  routers: routerApi,
  alerts: alertApi,
  vouchers: voucherApi,
};

// Default export for original usage pattern
export default {
  package: packageApi,
  payment: paymentApi,
  session: sessionApi,
  analytics: analyticsApi,
};

// Export error class
export { ApiError };

// Export types for convenience
export type { ApiResponse, PaginatedResponse };