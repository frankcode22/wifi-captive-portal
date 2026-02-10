// ============================================
// SUBSCRIPTION API SERVICE
// ============================================

import type {
  Subscription,
  SubscriptionStats,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  ActivateSubscriptionRequest,
  ChangePackageRequest,
  SubscriptionDetailsResponse,
  SubscriptionFilters,
} from '../types/subscription-types';




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

const API_BASE_URL =  getApiBaseUrl()

class SubscriptionService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || error.message || 'API request failed');
    }

    const data = await response.json();
    return data.data || data;
  }

  /**
   * Get all subscriptions with optional filtering
   */
  async getAll(filters?: SubscriptionFilters): Promise<Subscription[]> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.packageId) params.append('packageId', filters.packageId);
    if (filters?.billingCycle) params.append('billingCycle', filters.billingCycle);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    return this.request<Subscription[]>(
      `/subscriptions${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get subscription by ID with details
   */
  async getById(subscriptionId: string): Promise<SubscriptionDetailsResponse> {
    return this.request<SubscriptionDetailsResponse>(`/subscriptions/${subscriptionId}`);
  }

  /**
   * Get all subscriptions for a customer
   */
  async getByCustomerId(customerId: string): Promise<Subscription[]> {
    return this.request<Subscription[]>(`/subscriptions/customer/${customerId}`);
  }

  /**
   * Get subscription statistics
   */
  async getStats(): Promise<SubscriptionStats> {
    return this.request<SubscriptionStats>('/subscriptions/stats/overview');
  }

  /**
   * Create new subscription
   */
  async create(data: CreateSubscriptionRequest): Promise<{
    subscription: Subscription;
    credentials: {
      username: string;
      password: string;
    };
  }> {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update subscription
   */
  async update(
    subscriptionId: string,
    data: UpdateSubscriptionRequest
  ): Promise<Subscription> {
    return this.request(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Activate subscription after payment
   */
  async activate(
    subscriptionId: string,
    data: ActivateSubscriptionRequest
  ): Promise<Subscription> {
    return this.request(`/subscriptions/${subscriptionId}/activate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Suspend subscription
   */
  async suspend(
    subscriptionId: string,
    reason?: string
  ): Promise<Subscription> {
    return this.request(`/subscriptions/${subscriptionId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Payment overdue' }),
    });
  }

  /**
   * Cancel subscription
   */
  async cancel(
    subscriptionId: string,
    deleteAccount: boolean = false
  ): Promise<Subscription> {
    return this.request(`/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ deleteAccount }),
    });
  }

  /**
   * Change package (upgrade/downgrade)
   */
  async changePackage(
    subscriptionId: string,
    newPackageId: string
  ): Promise<{
    subscription: Subscription;
    oldPackage: any;
    newPackage: any;
  }> {
    return this.request(`/subscriptions/${subscriptionId}/package`, {
      method: 'PUT',
      body: JSON.stringify({ newPackageId }),
    });
  }

  /**
   * Update usage statistics
   */
  async updateUsage(subscriptionId: string): Promise<Subscription> {
    return this.request(`/subscriptions/${subscriptionId}/usage/update`, {
      method: 'POST',
    });
  }

  /**
   * Process due subscriptions (billing)
   */
  async processBilling(): Promise<{
    processed: number;
    failed: number;
    suspended: number;
  }> {
    return this.request('/subscriptions/billing/process', {
      method: 'POST',
    });
  }

  /**
   * Process expired grace periods
   */
  async processGracePeriods(): Promise<{
    processed: number;
  }> {
    return this.request('/subscriptions/grace-periods/process', {
      method: 'POST',
    });
  }
}

export const subscriptionApi = new SubscriptionService();