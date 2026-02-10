// ============================================
// UPDATED API SERVICE FOR MYSQL + SEQUELIZE BACKEND
// Aligned with Consolidated Package Model
// ============================================

import type {
  ApiResponse,
  Package,
  CreatePackageRequest,
  UpdatePackageRequest,
  Voucher,
  OnlineUser,
  Transaction,
} from '../types/update-types';

// Import the helper function if available
// import { backendToFrontendPackage } from '../types/update-types';

// API Configuration - will be auto-detected from host machine
const getApiBaseUrl = () => {
  // In production, this should match your backend server IP
  const host = window.location.hostname;
  const port = 3000; // Your backend port
  
  // If on localhost, use localhost, otherwise use the host IP
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://localhost:${port}/api`;
  }
  
  return `http://${host}:${port}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// const API_BASE_URL = 'http://192.168.91.195:3000/api';

const API_TIMEOUT = 30000;

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
// HELPER FUNCTIONS FOR PACKAGE CONVERSION
// ============================================

/**
 * Convert backend package to frontend package format
 */
function convertBackendPackage(backendPkg: any): Package {
  // Parse features from JSON string if needed
  let features: string[] = [];
  if (backendPkg.features) {
    if (Array.isArray(backendPkg.features)) {
      features = backendPkg.features;
    } else if (typeof backendPkg.features === 'string') {
      try {
        features = JSON.parse(backendPkg.features);
      } catch {
        features = [];
      }
    }
  }

  // Parse metadata from JSON string if needed
  let metadata: Record<string, any> | undefined;
  if (backendPkg.metadata) {
    if (typeof backendPkg.metadata === 'string') {
      try {
        metadata = JSON.parse(backendPkg.metadata);
      } catch {
        metadata = undefined;
      }
    } else {
      metadata = backendPkg.metadata;
    }
  }

  // Parse speed limit
  const speedLimit = backendPkg.speed_limit || backendPkg.speedLimit || '2M/2M';
  const speeds = speedLimit.split('/');
  const downloadSpeed = speeds[1] || speeds[0] || '2M';
  const uploadSpeed = speeds[0] || '2M';

  return {
    // Primary keys
    id: backendPkg.id || 0,
    packageId: backendPkg.package_id || backendPkg.packageId || '',

    // Basic information
    name: backendPkg.name || '',
    displayName: backendPkg.display_name || backendPkg.displayName || backendPkg.name || null,
    description: backendPkg.description || null,
    category: backendPkg.category || null,

    // Package type & billing
    packageType: (backendPkg.package_type || backendPkg.packageType || 'hotspot') as 'hotspot' | 'pppoe',
    billingPeriod: backendPkg.billing_period || backendPkg.billingPeriod || null,

    // Pricing
    price: parseFloat(backendPkg.price || 0),
    currency: backendPkg.currency || 'KES',
    promotionalPrice: backendPkg.promotional_price ? parseFloat(backendPkg.promotional_price) : null,
    promotionValidUntil: backendPkg.promotion_valid_until ? new Date(backendPkg.promotion_valid_until) : null,

    // Duration
    duration: backendPkg.duration || null,

    // Speed configuration
    speedLimit: speedLimit,
    downloadSpeed: backendPkg.download_speed || backendPkg.downloadSpeed || downloadSpeed,
    uploadSpeed: backendPkg.upload_speed || backendPkg.uploadSpeed || uploadSpeed,

    // Data quota
    dataQuota: backendPkg.data_quota || backendPkg.dataQuota || null,
    dataLimit: backendPkg.data_limit || backendPkg.dataLimit || null,

    // User limits
    sharedUsers: backendPkg.shared_users || backendPkg.sharedUsers || 1,

    // MikroTik configuration
    profileName: backendPkg.profile_name || backendPkg.profileName || null,
    addressPool: backendPkg.address_pool || backendPkg.addressPool || null,

    // Advanced MikroTik features
    burstLimit: backendPkg.burst_limit || backendPkg.burstLimit || null,
    burstThreshold: backendPkg.burst_threshold || backendPkg.burstThreshold || null,
    burstTime: backendPkg.burst_time || backendPkg.burstTime || null,
    priority: backendPkg.priority || null,
    transparentProxy: backendPkg.transparent_proxy || backendPkg.transparentProxy || false,

    // Subscription settings
    autoRenewal: backendPkg.auto_renewal || backendPkg.autoRenewal || false,
    gracePeriodDays: backendPkg.grace_period_days || backendPkg.gracePeriodDays || 0,

    // Features & UI
    features: features,
    icon: backendPkg.icon || 'wifi',
    color: backendPkg.color || '#3B82F6',
    isFeatured: backendPkg.is_featured ?? backendPkg.isFeatured ?? false,
    isActive: backendPkg.is_active ?? backendPkg.isActive ?? true,
    sortOrder: backendPkg.sort_order || backendPkg.sortOrder || 0,

    // Metadata
    metadata: metadata,

    // Timestamps
    createdAt: backendPkg.created_at ? new Date(backendPkg.created_at) : new Date(),
    updatedAt: backendPkg.updated_at ? new Date(backendPkg.updated_at) : new Date(),

    // Stats (if provided)
    activeUsers: backendPkg.activeUsers || 0,
    totalRevenue: backendPkg.totalRevenue || 0,
  };
}

/**
 * Convert frontend package to backend format
 */
function convertToBackendPackage(pkg: CreatePackageRequest | UpdatePackageRequest): any {
  const backendPkg: any = {};

  // Basic fields
  if ('packageId' in pkg && pkg.packageId) backendPkg.package_id = pkg.packageId;
  if (pkg.name) backendPkg.name = pkg.name;
  if (pkg.displayName !== undefined) backendPkg.display_name = pkg.displayName;
  if (pkg.description !== undefined) backendPkg.description = pkg.description;
  if (pkg.category !== undefined) backendPkg.category = pkg.category;

  // Type & billing
  if (pkg.packageType) backendPkg.package_type = pkg.packageType;
  if (pkg.billingPeriod !== undefined) backendPkg.billing_period = pkg.billingPeriod;

  // Pricing
  if (pkg.price !== undefined) backendPkg.price = pkg.price;
  if (pkg.currency) backendPkg.currency = pkg.currency;
  if (pkg.promotionalPrice !== undefined) backendPkg.promotional_price = pkg.promotionalPrice;
  if (pkg.promotionValidUntil !== undefined) backendPkg.promotion_valid_until = pkg.promotionValidUntil;

  // Duration
  if (pkg.duration !== undefined) backendPkg.duration = pkg.duration;

  // Speed configuration
  if (pkg.speedLimit) {
    backendPkg.speed_limit = pkg.speedLimit;
  } else if (pkg.downloadSpeed && pkg.uploadSpeed) {
    // Auto-generate speedLimit from download/upload speeds
    backendPkg.speed_limit = `${pkg.uploadSpeed}/${pkg.downloadSpeed}`;
  }
  if (pkg.downloadSpeed !== undefined) backendPkg.download_speed = pkg.downloadSpeed;
  if (pkg.uploadSpeed !== undefined) backendPkg.upload_speed = pkg.uploadSpeed;

  // Data quota
  if (pkg.dataQuota !== undefined) backendPkg.data_quota = pkg.dataQuota;
  if (pkg.dataLimit !== undefined) backendPkg.data_limit = pkg.dataLimit;

  // User limits
  if (pkg.sharedUsers !== undefined) backendPkg.shared_users = pkg.sharedUsers;

  // MikroTik configuration
  if (pkg.profileName !== undefined) backendPkg.profile_name = pkg.profileName;
  if (pkg.addressPool !== undefined) backendPkg.address_pool = pkg.addressPool;

  // Advanced MikroTik
  if (pkg.burstLimit !== undefined) backendPkg.burst_limit = pkg.burstLimit;
  if (pkg.burstThreshold !== undefined) backendPkg.burst_threshold = pkg.burstThreshold;
  if (pkg.burstTime !== undefined) backendPkg.burst_time = pkg.burstTime;
  if (pkg.priority !== undefined) backendPkg.priority = pkg.priority;
  if (pkg.transparentProxy !== undefined) backendPkg.transparent_proxy = pkg.transparentProxy;

  // Subscription settings
  if (pkg.autoRenewal !== undefined) backendPkg.auto_renewal = pkg.autoRenewal;
  if (pkg.gracePeriodDays !== undefined) backendPkg.grace_period_days = pkg.gracePeriodDays;

  // Features & UI
  if (pkg.features !== undefined) backendPkg.features = JSON.stringify(pkg.features);
  if (pkg.icon !== undefined) backendPkg.icon = pkg.icon;
  if (pkg.color !== undefined) backendPkg.color = pkg.color;
  if (pkg.isFeatured !== undefined) backendPkg.is_featured = pkg.isFeatured;
  if (pkg.isActive !== undefined) backendPkg.is_active = pkg.isActive;
  if (pkg.sortOrder !== undefined) backendPkg.sort_order = pkg.sortOrder;

  // Metadata
  if (pkg.metadata !== undefined) backendPkg.metadata = JSON.stringify(pkg.metadata);

  return backendPkg;
}

// ============================================
// PACKAGE API (Updated for Consolidated Model)
// ============================================

export const packageApi = {
  /**
   * Get all packages with stats
   */
  getAll: async (): Promise<Package[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/packages`);
    const data = await handleResponse<ApiResponse<any[]>>(response);
    
    if (!data.success || !data.data) {
      return [];
    }

    return data.data.map(convertBackendPackage);
  },

  /**
   * Alias for getAll (for backward compatibility)
   */
  getAllWithStats: async (): Promise<Package[]> => {
    return packageApi.getAll();
  },

  /**
   * Get package by ID
   */
  getById: async (packageId: string): Promise<Package> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/packages/${packageId}`);
    const data = await handleResponse<ApiResponse<any>>(response);
    
    if (!data.success || !data.data) {
      throw new ApiError('Package not found');
    }

    return convertBackendPackage(data.data);
  },

  /**
   * Get hotspot packages only
   */
  getHotspot: async (): Promise<Package[]> => {
    const allPackages = await packageApi.getAll();
    return allPackages.filter(pkg => pkg.packageType === 'hotspot');
  },

  /**
   * Get PPPoE packages only
   */
  getPPPoE: async (): Promise<Package[]> => {
    const allPackages = await packageApi.getAll();
    return allPackages.filter(pkg => pkg.packageType === 'pppoe');
  },

  /**
   * Get featured packages
   */
  getFeatured: async (): Promise<Package[]> => {
    const allPackages = await packageApi.getAll();
    return allPackages.filter(pkg => pkg.isFeatured && pkg.isActive);
  },

  /**
   * Create new package
   */
  create: async (packageData: CreatePackageRequest): Promise<Package> => {
    const backendData = convertToBackendPackage(packageData);

    const response = await fetchWithTimeout(`${API_BASE_URL}/packages`, {
      method: 'POST',
      body: JSON.stringify(backendData),
    });

    const data = await handleResponse<ApiResponse<any>>(response);
    if (!data.success || !data.data) {
      throw new ApiError('Failed to create package');
    }

    return convertBackendPackage(data.data);
  },

  /**
   * Update package
   */
  update: async (packageId: string, packageData: UpdatePackageRequest): Promise<Package> => {
    const backendData = convertToBackendPackage(packageData);

    const response = await fetchWithTimeout(`${API_BASE_URL}/packages/${packageId}`, {
      method: 'PUT',
      body: JSON.stringify(backendData),
    });

    const data = await handleResponse<ApiResponse<any>>(response);
    if (!data.success || !data.data) {
      throw new ApiError('Failed to update package');
    }

    return convertBackendPackage(data.data);
  },

  /**
   * Delete package
   */
  delete: async (packageId: string): Promise<void> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/packages/${packageId}`, {
      method: 'DELETE',
    });
    
    await handleResponse<ApiResponse<any>>(response);
  },

  /**
   * Toggle package active status
   */
  toggleActive: async (packageId: string, currentStatus: boolean): Promise<Package> => {
    return packageApi.update(packageId, { isActive: !currentStatus });
  },
};

// ============================================
// VOUCHER API (Updated for MySQL Backend)
// ============================================

export const voucherApi = {
  /**
   * Get all vouchers
   */
  getAll: async (): Promise<Voucher[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/vouchers`);
    const data = await handleResponse<ApiResponse<any[]>>(response);
    
    if (!data.success || !data.data) {
      return [];
    }

    // Map backend vouchers to frontend format
    return data.data.map(v => ({
      id: v.id?.toString() || v.voucher_code,
      voucherId: v.id?.toString() || v.voucher_code,
      code: v.voucher_code,
      type: 'package' as const,
      packageId: v.package_id,
      status: v.status,
      isActive: v.status === 'active',
      macAddress: v.mac_address,
      usedAt: v.used_at ? new Date(v.used_at) : undefined,
      expiresAt: v.expires_at ? new Date(v.expires_at) : undefined,
      validUntil: v.expires_at ? new Date(v.expires_at) : undefined,
      createdBy: v.created_by,
      usedCount: v.status === 'used' ? 1 : 0,
      maxUses: 1,
      createdAt: v.created_at ? new Date(v.created_at) : new Date(),
      updatedAt: v.updated_at ? new Date(v.updated_at) : new Date(),
    }));
  },

  /**
   * Create voucher(s)
   */
  create: async (voucherData: any): Promise<Voucher[]> => {
    const backendData = {
      packageId: voucherData.packageId,
      quantity: voucherData.count || 1,
      expiryDays: voucherData.validUntil 
        ? Math.ceil((new Date(voucherData.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 30,
      createdBy: voucherData.createdBy || 'admin',
    };

    const response = await fetchWithTimeout(`${API_BASE_URL}/voucher/generate`, {
      method: 'POST',
      body: JSON.stringify(backendData),
    });

    const data = await handleResponse<ApiResponse<any>>(response);
    
    if (!data.success || !data.data?.vouchers) {
      throw new ApiError('Failed to create vouchers');
    }

    return data.data.vouchers.map((v: any) => ({
      id: v.voucherCode,
      voucherId: v.voucherCode,
      code: v.voucherCode,
      type: 'package' as const,
      packageId: v.packageId,
      status: 'active',
      isActive: true,
      validUntil: v.expiresAt ? new Date(v.expiresAt) : undefined,
      expiresAt: v.expiresAt ? new Date(v.expiresAt) : undefined,
      usedCount: 0,
      maxUses: 1,
      createdAt: new Date(),
    }));
  },

  /**
   * Delete voucher
   */
  delete: async (code: string): Promise<void> => {
    throw new ApiError('Delete not implemented - mark as cancelled instead', 501);
  },

  /**
   * Toggle voucher status
   */
  toggleActive: async (code: string, isActive: boolean): Promise<Voucher> => {
    throw new ApiError('Toggle not implemented', 501);
  },
};

// ============================================
// SESSION/USERS API
// ============================================

export const sessionApi = {
  /**
   * Get online users
   */
  getOnlineUsers: async (): Promise<OnlineUser[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/sessions/all/active?limit=100`);
    const data = await handleResponse<ApiResponse<any>>(response);
    
    if (!data.success || !data.data?.sessions) {
      return [];
    }

    return data.data.sessions
      .filter((s: any) => s.status === 'active')
      .map((s: any) => ({
        id: s.session_id,
        username: s.phone_number || s.mac_address,
        phone: s.phone_number || 'N/A',
        email: '',
        ipAddress: '0.0.0.0',
        macAddress: s.mac_address,
        packageName: s.package?.name || s.package?.display_name || 'Unknown',
        packageId: s.package_id,
        timeRemaining: s.end_time 
          ? Math.max(0, Math.floor((new Date(s.end_time).getTime() - Date.now()) / 60000))
          : 0,
        dataUsed: 0,
        connectedAt: s.start_time ? new Date(s.start_time) : new Date(s.created_at),
        sessionId: s.session_id,
        location: 'Unknown',
      }));
  },
};

// ============================================
// TRANSACTIONS API
// ============================================

export const transactionApi = {
  /**
   * Get all transactions
   */
  getAll: async (): Promise<Transaction[]> => {
    const sessionsResponse = await fetchWithTimeout(`${API_BASE_URL}/sessions/all/active?limit=100`);
    const sessionsData = await handleResponse<ApiResponse<any>>(sessionsResponse);
    
    if (!sessionsData.success || !sessionsData.data?.sessions) {
      return [];
    }

    return sessionsData.data.sessions
      .filter((s: any) => s.payment_method === 'mpesa')
      .map((s: any) => ({
        id: s.id?.toString() || s.session_id,
        transactionId: s.session_id,
        userId: s.mac_address,
        username: s.phone_number || s.mac_address,
        phone: s.phone_number || 'N/A',
        email: '',
        amount: parseFloat(s.amount || 0),
        currency: 'KES',
        paymentMethod: 'mpesa' as const,
        packageName: s.package?.name || s.package?.display_name || 'Unknown',
        packageId: s.package_id,
        status: s.status === 'active' || s.status === 'expired' ? 'success' as const : 
                s.status === 'pending' ? 'pending' as const : 'failed' as const,
        transactionRef: s.mpesa_receipt || s.checkout_request_id || s.session_id,
        externalRef: s.checkout_request_id,
        timestamp: new Date(s.created_at),
        isActivated: s.status === 'active' || s.status === 'expired',
        activatedAt: s.start_time ? new Date(s.start_time) : undefined,
      }));
  },
};

// ============================================
// UNIFIED API EXPORT
// ============================================

export const api = {
  packages: packageApi,
  vouchers: voucherApi,
  sessions: sessionApi,
  transactions: transactionApi,
  users: {
    getOnline: sessionApi.getOnlineUsers,
  },
};

export { ApiError };
export type { ApiResponse };