// ============================================
// TYPES - Complete Type Definitions
// ============================================

// ============================================
// BASE TYPES
// ============================================

export type TimeRange = 'today' | '7days' | '30days';
export type PaymentMethod = 'mpesa' | 'pesapal' | 'cash' | 'voucher' | 'card' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'success' | 'failed';
export type PackageType = 'time' | 'data' | 'unlimited';
export type ValidityUnit = 'hours' | 'days' | 'weeks' | 'months' | 'GB' | 'MB';
export type RouterStatus = 'online' | 'offline' | 'warning';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'activation_required' | 'router_offline' | 'low_balance' | 'system';
export type VoucherType = 'discount' | 'credit' | 'package';
export type DiscountType = 'percentage' | 'fixed';

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchParams {
  page?: number;
  limit?: number;
  query?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// PACKAGE TYPES
// ============================================

export interface Package {
  id: string;
  packageId: string;
  name: string;
  displayName?: string;
  description: string;
  price: number;
  currency: string;
  type: PackageType;
  validity: number;
  validityUnit: ValidityUnit;
  duration?: number;
  durationUnit?: string;
  speedLimit?: number;
  downloadSpeed: number;
  uploadSpeed: number;
  dataLimit?: number;
  mikrotikProfile?: string;
  activeUsers?: number;
  totalRevenue?: number;
  isActive: boolean;
  isFeatured: boolean;
  allowAutoRenewal?: boolean;
  displayOrder?: number;
  icon?: string;
  color?: string;
  category?: string;
  features?: string[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePackageRequest {
  name: string;
  displayName?: string;
  description: string;
  price: number;
  currency: string;
  type: PackageType;
  validity: number;
  validityUnit: ValidityUnit;
  duration?: number;
  durationUnit?: string;
  speedLimit?: number;
  downloadSpeed: number;
  uploadSpeed: number;
  dataLimit?: number;
  mikrotikProfile?: string;
  isActive: boolean;
  isFeatured: boolean;
  allowAutoRenewal?: boolean;
  displayOrder?: number;
  icon?: string;
  color?: string;
  category?: string;
  features?: string[];
  metadata?: Record<string, any>;
}

export interface UpdatePackageRequest {
  name?: string;
  displayName?: string;
  description?: string;
  price?: number;
  currency?: string;
  type?: PackageType;
  validity?: number;
  validityUnit?: ValidityUnit;
  duration?: number;
  durationUnit?: string;
  speedLimit?: number;
  downloadSpeed?: number;
  uploadSpeed?: number;
  dataLimit?: number;
  mikrotikProfile?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  allowAutoRenewal?: boolean;
  displayOrder?: number;
  icon?: string;
  color?: string;
  category?: string;
  features?: string[];
  metadata?: Record<string, any>;
}

// ============================================
// VOUCHER TYPES
// ============================================

export interface Voucher {
  id: string;
  voucherId: string;
  code: string;
  type: VoucherType;
  discountType?: DiscountType;
  discountValue?: number;
  maxDiscount?: number;
  minPurchase?: number;
  applicablePackages?: string[];
  packageId?: string;
  maxUses?: number;
  usedCount: number;
  maxUsesPerUser?: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
  description?: string;
  terms?: string;
  createdBy?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateVoucherRequest {
  code?: string;
  count: number; // Required - number of vouchers to generate
  prefix?: string;
  type: VoucherType;
  discountType?: DiscountType;
  discountValue?: number;
  maxDiscount?: number;
  minPurchase?: number;
  applicablePackages?: string[];
  packageId?: string;
  maxUses?: number;
  maxUsesPerUser?: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
  description?: string;
  terms?: string;
  createdBy?: string;
  metadata?: Record<string, any>;
}

export interface UpdateVoucherRequest {
  isActive?: boolean;
  maxUses?: number;
  validUntil?: Date;
  description?: string;
  terms?: string;
  metadata?: Record<string, any>;
}

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  userId: string;
  username: string;
  phone: string;
  email?: string;
  macAddress?: string;
  status: 'active' | 'suspended' | 'expired';
  currentPackage?: string;
  currentPackageId?: string;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnlineUser {
  id: string;
  username: string;
  phone: string;
  email?: string;
  ipAddress: string;
  macAddress: string;
  packageName: string;
  packageId: string;
  timeRemaining: number;
  dataUsed: number;
  connectedAt: Date;
  sessionId: string;
  location?: string;
}

export interface CreateUserRequest {
  username: string;
  phone: string;
  email?: string;
  macAddress?: string;
  packageId: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  autoRenewal?: boolean;
  notes?: string;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export interface Transaction {
  id: string;
  transactionId?: string;
  userId: string;
  username: string;
  phone: string;
  email?: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  packageName: string;
  packageId: string;
  status: PaymentStatus;
  transactionRef: string;
  externalRef?: string;
  timestamp: Date;
  autoRenewal?: boolean;
  isActivated: boolean;
  activatedAt?: Date;
  failureReason?: string;
}

export interface CreateTransactionRequest {
  userId: string;
  packageId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef: string;
  externalRef?: string;
  autoRenewal?: boolean;
}

export interface PendingPayment {
  id: string;
  transactionRef: string;
  username: string;
  phone: string;
  packageName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  timestamp: Date;
  needsActivation: boolean;
}

// ============================================
// SUBSCRIPTION TYPES
// ============================================

export interface Subscription {
  id: string;
  subscriptionId: string;
  userId: string;
  packageId: string;
  packageName: string;
  status: 'active' | 'expired' | 'cancelled';
  startDate: Date;
  expiryDate: Date;
  autoRenewal: boolean;
  createdAt: Date;
}

export interface ActivateSubscriptionRequest {
  userId: string;
  packageId: string;
  paymentReference: string;
  startImmediately?: boolean;
  notes?: string;
}

// ============================================
// ROUTER TYPES
// ============================================

export interface Router {
  id: string;
  routerId?: string;
  name: string;
  ipAddress: string;
  location: string;
  status: RouterStatus;
  cpuUsage: number;
  ramUsage: number;
  bandwidthIn: number;
  bandwidthOut: number;
  activeSessions: number;
  uptime: number;
  lastPing: Date;
  model?: string;
  temperature?: number;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface SummaryMetrics {
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
  activeUsers: number;
  totalRegisteredUsers: number;
  expiredSuspendedUsers: number;
  pendingActivations: number;
  dataUsageToday: number;
  newPaymentsToday: number;
  revenueChange: number;
  activeUsersChange: number;
  dataUsageChange: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactions: number;
}

export interface PaymentMethodBreakdown {
  mpesa: number;
  pesapal: number;
  cash: number;
  voucher: number;
  card: number;
  bank_transfer: number;
}

// ============================================
// ALERT TYPES
// ============================================

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionLabel?: string;
  relatedId?: string;
}