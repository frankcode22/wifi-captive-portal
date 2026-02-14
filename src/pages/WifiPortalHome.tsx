import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Wifi, Clock, Zap, Star, CheckCircle2, Loader2, AlertCircle, Phone, CreditCard, ArrowRight, X, Laptop, Shield, Ticket } from 'lucide-react';

// ============================================
// CONFIGURATION
// ============================================

const getApiBaseUrl = () => {
  const host = window.location.hostname;
  const port = 3000;
  
  // Check if running locally
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://localhost:${port}/api`;
  }
  
  // Check if it's the dev subdomain
  if (host.includes('dev.') || host.includes('development.')) {
    return 'https://backend.ashvillecomsolutions.co.ke/api';
  }
  
  // Production
  return 'https://backend.ashvillecomsolutions.co.ke/api';
};

const API_BASE_URL = getApiBaseUrl();

// Types
interface Package {
  packageId: string;
  name: string;
  displayName?: string;
  duration: number;
  price: number;
  currency?: string;
  speedLimit: string;
  description?: string;
  features: string[];
  icon: string;
  color: string;
  isFeatured?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

type PaymentStatusType = 'idle' | 'initiating' | 'waiting' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'error' | 'syncing';

interface PaymentStatus {
  status: PaymentStatusType;
  message: string;
  checkoutRequestID?: string;
  sessionId?: string;
  transactionId?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface SessionData {
  sessionId: string;
  packageName?: string;
  startTime: string;
  expiryTime: string;
  status: string;
  bytesIn?: number;
  bytesOut?: number;
  mikrotikActive?: boolean;
}

interface AutoLoginData {
  username: string;
  password: string;
  voucherCode: string;
  profile: string;
  duration: string;
  expiryDate: string;
}

// Package Card Component - Memoized for performance
const PackageCard = memo(({ 
  pkg, 
  onSelect, 
  getIcon 
}: { 
  pkg: Package; 
  onSelect: (pkg: Package) => void;
  getIcon: (iconName: string) => React.ReactElement;
}) => (
  <div
    onClick={() => onSelect(pkg)}
    className="relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 border-2 border-transparent hover:border-blue-500"
  >
    {pkg.isFeatured && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="px-3 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-md">
          POPULAR
        </span>
      </div>
    )}

    <div className="p-4">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto"
        style={{ backgroundColor: pkg.color + '20', color: pkg.color }}
      >
        {getIcon(pkg.icon)}
      </div>

      <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
        {pkg.displayName || pkg.name}
      </h3>

      <div className="text-center mb-4">
        <span className="text-3xl font-bold text-gray-900">
          {pkg.price}
        </span>
        <span className="text-base text-gray-600 ml-1">{pkg.currency || 'KES'}</span>
      </div>

      <div className="space-y-2 mb-4">
        {pkg.features.slice(0, 3).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <button className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center gap-2 group-hover:gap-3">
        Select
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
));

PackageCard.displayName = 'PackageCard';

const WifiPortalHome: React.FC = () => {
  // State Management
  const [packages, setPackages] = useState<Package[]>(() => {
    try {
      const cached = sessionStorage.getItem('wifi_packages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 300000) {
          return parsed.data;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return [];
  });
  
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'idle',
    message: ''
  });
  const [errors, setErrors] = useState<{ phone?: string; mac?: string; voucher?: string }>({});
  const [macAddress, setMacAddress] = useState('');
  const [loading, setLoading] = useState(packages.length === 0);
  const [pollCount, setPollCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isVoucherMode, setIsVoucherMode] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [autoLoginAttempts, setAutoLoginAttempts] = useState(0);

  const pollingIntervalRef = useRef<number | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const autoLoginIntervalRef = useRef<number | null>(null);

  // Get URL parameters for MikroTik integration
  const urlParams = new URLSearchParams(window.location.search);
  const linkLogin = urlParams.get('link-login') || urlParams.get('link-login-only') || '';
  const linkOrig = urlParams.get('link-orig') || urlParams.get('dst') || 'http://www.google.com';

  useEffect(() => {
    console.log('=== DEBUG INFO ===');
    console.log('Full URL:', window.location.href);
    console.log('All URL Params:', Object.fromEntries(urlParams));
    console.log('Link-Login:', linkLogin);
    console.log('Link-Orig:', linkOrig);
  }, []);

  // Fetch packages and check for active session on mount
  useEffect(() => {
    const mac = getMacAddressSync();
    setMacAddress(mac);
    
    Promise.all([
      fetchPackages(),
      checkActiveSession(mac)
    ]).catch(console.error);
  }, []);

  // Preload critical resources
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = API_BASE_URL;
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Timer for elapsed time display
  useEffect(() => {
    let timer: number;
    if (paymentStatus.status === 'waiting') {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000) as any;
    } else {
      setTimeElapsed(0);
    }
    return () => clearInterval(timer);
  }, [paymentStatus.status]);

  // Countdown timer for redirect
  useEffect(() => {
    if (paymentStatus.status === 'success') {
      setRedirectCountdown(5);
      
      redirectTimerRef.current = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            // Redirect to original destination or Google
            const destination = decodeURIComponent(linkOrig);
            window.location.href = destination;
            return 0;
          }
          return prev - 1;
        });
      }, 1000) as any;
    }

    return () => {
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [paymentStatus.status, linkOrig]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
      }
      if (autoLoginIntervalRef.current) {
        clearInterval(autoLoginIntervalRef.current);
      }
    };
  }, []);

  /**
   * Get MAC address from URL parameters - ENHANCED
   */
  const getMacAddressSync = (): string => {
    let mac = 
      urlParams.get('mac') || 
      urlParams.get('id') || 
      urlParams.get('client-mac-address') ||
      urlParams.get('username') ||
      '';
    
    // Clean up if MikroTik variable wasn't replaced
    if (mac.startsWith('$(') && mac.endsWith(')')) {
      console.warn('⚠️ MikroTik variable not replaced:', mac);
      mac = '';
    }
    
    // Decode URL encoding
    mac = decodeURIComponent(mac);
    
    console.log('🔍 MAC extracted:', mac);
    
    return mac;
  };

  /**
   * Check for active session
   */
  const checkActiveSession = async (mac?: string) => {
    const macToUse = mac || macAddress;
    if (!macToUse) return;

    try {
      const cached = sessionStorage.getItem(`session_${macToUse}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30000) {
          setActiveSession(parsed.data);
          return;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${API_BASE_URL}/sessions/active/${macToUse}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const result: ApiResponse<SessionData> = await response.json();

      if (result.success && result.data) {
        setActiveSession(result.data);
        sessionStorage.setItem(`session_${macToUse}`, JSON.stringify({
          data: result.data,
          timestamp: Date.now()
        }));
      } else {
        setActiveSession(null);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Error checking active session:', error);
      }
      setActiveSession(null);
    }
  };

  /**
   * Fetch available packages from API
   */
  const fetchPackages = async () => {
    if (packages.length > 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }

      fetchControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => fetchControllerRef.current?.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/packages`, {
        signal: fetchControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      const result: ApiResponse<Package[]> = await response.json();

      if (result.success && result.data) {
        const mappedPackages = result.data.map(pkg => ({
          ...pkg,
          features: Array.isArray(pkg.features) 
            ? pkg.features 
            : typeof pkg.features === 'string'
            ? JSON.parse(pkg.features)
            : [],
          icon: pkg.icon || getDefaultIcon(pkg.packageId),
          color: pkg.color || getDefaultColor(pkg.packageId),
          displayName: pkg.displayName || pkg.name
        }));
        
        setPackages(mappedPackages);

        try {
          sessionStorage.setItem('wifi_packages', JSON.stringify({
            data: mappedPackages,
            timestamp: Date.now()
          }));
        } catch (e) {
          // Ignore cache errors
        }
      } else {
        setFallbackPackages();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Error fetching packages:', error);
        setFallbackPackages();
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Set fallback packages if API fails
   */
  const setFallbackPackages = () => {
    const fallbackPackages: Package[] = [
      {
        packageId: '1h',
        name: '1 Hour',
        duration: 3600,
        price: 10,
        speedLimit: '1M/1M',
        features: ['1 hour access', 'Basic speed'],
        icon: 'zap',
        color: '#F59E0B'
      },
      {
        packageId: '2h',
        name: '2 Hours',
        duration: 7200,
        price: 15,
        speedLimit: '2M/2M',
        features: ['2 hours access', 'Standard speed'],
        icon: 'clock',
        color: '#3B82F6'
      },
      {
        packageId: '24h',
        name: '24 Hours',
        duration: 86400,
        price: 50,
        speedLimit: '5M/5M',
        features: ['Full day access', 'High speed'],
        isFeatured: true,
        icon: 'star',
        color: '#10B981'
      }
    ];
    setPackages(fallbackPackages);
  };

  const getDefaultIcon = (packageId: string): string => {
    if (packageId.includes('24') || packageId.includes('day')) return 'star';
    if (packageId.includes('2') || packageId.includes('hour')) return 'clock';
    return 'zap';
  };

  const getDefaultColor = (packageId: string): string => {
    if (packageId.includes('24') || packageId.includes('day')) return '#10B981';
    if (packageId.includes('2') || packageId.includes('hour')) return '#3B82F6';
    return '#F59E0B';
  };

  /**
   * Validate Kenyan phone number
   */
  const validatePhoneNumber = (phone: string): boolean => {
    const kenyanPhoneRegex = /^(?:254|\+254|0)?([17]\d{8})$/;
    if (!kenyanPhoneRegex.test(phone)) {
      setErrors(prev => ({ 
        ...prev, 
        phone: 'Please enter a valid Kenyan phone number (e.g., 0712345678)' 
      }));
      return false;
    }
    setErrors(prev => ({ ...prev, phone: undefined }));
    return true;
  };

  /**
   * Format phone number to international format
   */
  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  /**
   * Handle package selection
   */
  const handlePackageSelect = useCallback((pkg: Package) => {
    setSelectedPackage(pkg);
    setPaymentStatus({ status: 'idle', message: '' });
    setIsVoucherMode(false);
  }, []);

  /**
   * Auto-login to MikroTik hotspot
   */
 /**
 * Auto-login to MikroTik hotspot
 */
const attemptAutoLogin = async (transactionId: string) => {
  console.log('🔐 Starting auto-login process...');
  
  setPaymentStatus({
    status: 'syncing',
    message: '🔄 Syncing voucher to router...'
  });

  let attempts = 0;
  const maxAttempts = 12; // Try for 1 minute (5s intervals)
  
  if (autoLoginIntervalRef.current) {
    clearInterval(autoLoginIntervalRef.current);
    autoLoginIntervalRef.current = null;
  }

  autoLoginIntervalRef.current = setInterval(async () => {
    attempts++;
    setAutoLoginAttempts(attempts);
    
    console.log(`🔐 Auto-login attempt ${attempts}/${maxAttempts}`);

    // Check if max attempts reached FIRST
    if (attempts > maxAttempts) {
      console.error('❌ Auto-login max attempts reached');
      
      // Stop polling
      if (autoLoginIntervalRef.current) {
        clearInterval(autoLoginIntervalRef.current);
        autoLoginIntervalRef.current = null;
      }

      setPaymentStatus({
        status: 'success',
        message: '✅ Payment successful! Your voucher is being synced. Please check your internet connection in a moment.'
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/payment/auto-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          macAddress,
          transactionId 
        })
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('✅ Auto-login credentials received:', data.data);
        
        // Stop polling
        if (autoLoginIntervalRef.current) {
          clearInterval(autoLoginIntervalRef.current);
          autoLoginIntervalRef.current = null;
        }

        // Login to MikroTik
        await loginToMikroTik(data.data);
        return;
        
      } else if (response.status === 202) {
        // Voucher still syncing
        console.log('⏳ Voucher syncing... retrying...');
        setPaymentStatus({
          status: 'syncing',
          message: `⏳ Syncing voucher to router... (${attempts}/${maxAttempts})`
        });
        
      } else {
        console.error('❌ Auto-login failed:', data.error);
        
        // On last attempt, show error
        if (attempts >= maxAttempts) {
          if (autoLoginIntervalRef.current) {
            clearInterval(autoLoginIntervalRef.current);
            autoLoginIntervalRef.current = null;
          }

          setPaymentStatus({
            status: 'failed',
            message: `❌ Router not responding. Error: ${data.error || 'Sync timeout'}. Please contact support.`
          });
        }
      }
      
    } catch (error: any) {
      console.error('❌ Auto-login request error:', error);
      
      // On last attempt, show error
      if (attempts >= maxAttempts) {
        if (autoLoginIntervalRef.current) {
          clearInterval(autoLoginIntervalRef.current);
          autoLoginIntervalRef.current = null;
        }

        setPaymentStatus({
          status: 'failed',
          message: '❌ Unable to connect to router. Please contact support or try manual login with your voucher code.'
        });
      } else {
        // Update status with attempt count
        setPaymentStatus({
          status: 'syncing',
          message: `⏳ Router connection issue, retrying... (${attempts}/${maxAttempts})`
        });
      }
    }
  }, 5000) as any;
};
  /**
   * Login to MikroTik hotspot
   */
  const loginToMikroTik = async (credentials: AutoLoginData) => {
    try {
      console.log('🔐 Logging in to MikroTik hotspot...');
      console.log('Link-Login URL:', linkLogin);
      console.log('Credentials:', credentials);

      if (!linkLogin) {
        console.error('❌ No link-login URL found');
        setPaymentStatus({
          status: 'success',
          message: `✅ Payment successful! Your voucher code is: ${credentials.voucherCode}`
        });
        return;
      }

      // Build login URL
      const loginUrl = new URL(linkLogin);
      loginUrl.searchParams.set('username', credentials.username);
      loginUrl.searchParams.set('password', credentials.password);

      console.log('🔐 Login URL:', loginUrl.href);

      // Submit login
      await fetch(loginUrl.href, {
        method: 'GET',
        mode: 'no-cors' // MikroTik hotspot might not support CORS
      });

      console.log('✅ Login submitted to MikroTik');

      setPaymentStatus({
        status: 'success',
        message: '✅ Login successful! You are now connected to the internet.'
      });

    } catch (error) {
      console.error('❌ MikroTik login error:', error);
      
      setPaymentStatus({
        status: 'success',
        message: `✅ Payment successful! Your voucher code is: ${credentials.voucherCode}`
      });
    }
  };

  /**
   * Handle voucher redemption (for cash payments with voucher codes)
   */
  const handleVoucherRedemption = async () => {
    const code = voucherCode.trim().toUpperCase();
    
    if (!code) {
      setErrors(prev => ({ ...prev, voucher: 'Please enter a voucher code or M-Pesa transaction code' }));
      return;
    }

    try {
      setPaymentStatus({ status: 'initiating', message: '🎟️ Validating code...' });
      setErrors(prev => ({ ...prev, voucher: undefined }));

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎟️ FRONTEND: Redeeming voucher/code');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Code:', code);
      console.log('MAC Address:', macAddress);

      const response = await fetch(`${API_BASE_URL}/voucher/redeem`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          voucherCode: code,
          macAddress
        })
      });

      const responseData = await response.json();
      console.log('Voucher Response:', responseData);

      if (responseData.success) {
        setPaymentStatus({
          status: 'success',
          message: `✅ Code activated! You're now connected.`,
          sessionId: responseData.data?.sessionId
        });

        // Try auto-login if we have credentials
        if (responseData.data?.voucherCode) {
          await loginToMikroTik({
            username: responseData.data.voucherCode,
            password: responseData.data.voucherCode,
            voucherCode: responseData.data.voucherCode,
            profile: responseData.data.profile || 'default',
            duration: responseData.data.duration || '1:00:00',
            expiryDate: responseData.data.expiryDate || new Date().toISOString()
          });
        }

        // Refresh active session
        await checkActiveSession();
      } else {
        throw new Error(responseData.error || 'Invalid or expired code');
      }
    } catch (error: any) {
      console.error('❌ Voucher redemption error:', error);
      const errorMessage = error.message || 'Failed to redeem code';
      
      setPaymentStatus({
        status: 'failed',
        message: `❌ ${errorMessage}`
      });
      
      setErrors(prev => ({ ...prev, voucher: errorMessage }));
    }
  };

  /**
   * Initiate M-Pesa payment
   */
  const initiateMpesaPayment = async () => {
    if (!selectedPackage) {
      alert("No package selected. Please try again.");
      return;
    }

    if (!phoneNumber.trim()) {
      alert("Please enter a valid M-Pesa phone number");
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (formattedPhone.length !== 12 || !/^(2547|2541)[0-9]{8}$/.test(formattedPhone)) {
      alert("Please enter a valid Kenyan mobile number (e.g. 0712345678 or 254712345678)");
      return;
    }

    try {
      setPaymentStatus({ status: 'initiating', message: '📤 Sending payment request...' });
      setPollCount(0);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 FRONTEND: Initiating M-Pesa payment');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Phone:', formattedPhone);
      console.log('Amount:', Math.round(selectedPackage.price));
      console.log('Package:', selectedPackage.packageId);
      console.log('MAC Address:', macAddress);

      const response = await fetch(`${API_BASE_URL}/payment/initiate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          macAddress,
          phoneNumber: formattedPhone,
          package: selectedPackage.packageId,
          paymentMethod: 'mpesa'
        })
      });

      console.log('📨 FRONTEND: Received response from backend');
      console.log('Status:', response.status);

      const responseText = await response.text();
      console.log('Response Body (raw):', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Response Data:', JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = responseData.retryAfter || 30;
        throw new Error(`Please wait ${retryAfter} seconds before trying again`);
      }

      const checkoutRequestID = 
        responseData?.data?.checkoutRequestId ||
        responseData?.data?.CheckoutRequestID ||
        responseData?.checkoutRequestId ||
        responseData?.CheckoutRequestID ||
        null;

      const sessionId = 
        responseData?.data?.sessionId ||
        responseData?.sessionId ||
        null;

      console.log('Parsed values:', {
        checkoutRequestID,
        sessionId,
        responseSuccess: responseData?.success,
        httpStatus: response.status
      });

      // SUCCESS PATH
      if (checkoutRequestID) {
        console.log('✅ SUCCESS: CheckoutRequestID received:', checkoutRequestID);
        console.log('🔄 Starting payment status polling...');

        const customerMessage = responseData?.data?.customerMessage ||
            responseData?.customerMessage ||
            responseData?.message ||
            "📱 Check your phone for the M-Pesa prompt and enter your PIN";

        setPaymentStatus({
          status: 'waiting',
          message: customerMessage,
          checkoutRequestID,
          sessionId,
          transactionId: sessionId
        });

        pollPaymentStatus(sessionId || checkoutRequestID);
        return;
      }

      // DUPLICATE REQUEST (409)
      if (response.status === 409 && (checkoutRequestID || sessionId)) {
        console.log('⚠️ Duplicate request detected (409)');
        console.log('✅ Continuing with existing request:', checkoutRequestID || sessionId);
        
        setPaymentStatus({
          status: 'waiting',
          message: '⏳ Previous payment request detected. Checking status...',
          checkoutRequestID,
          sessionId,
          transactionId: sessionId
        });
        pollPaymentStatus(sessionId || checkoutRequestID);
        return;
      }

      // FAILURE
      console.error('❌ No CheckoutRequestID found in response');
      
      const errorMessage = 
        responseData?.message ||
        responseData?.error ||
        "Failed to initiate M-Pesa payment. Please try again.";

      throw new Error(errorMessage);

    } catch (err: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ FRONTEND: M-Pesa initiation error');
      console.error('Error object:', err);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const errorMessage = err.message || "Failed to initiate M-Pesa payment. Please try again.";

      setPaymentStatus({
        status: 'failed',
        message: `❌ ${errorMessage}`
      });

      alert(errorMessage);
    }
  };

  /**
   * Poll payment status
   */
  const pollPaymentStatus = (identifier: string) => {
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    let currentPollCount = 0;
    const maxPolls = 60;
    const pollIntervalMs = 5000;
    let isProcessing = false;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 STARTING PAYMENT STATUS POLLING');
    console.log('Identifier:', identifier);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    pollingIntervalRef.current = setInterval(async () => {
      currentPollCount++;
      setPollCount(currentPollCount);

      if (isProcessing) {
        console.log('⏹️ Already processing final state, skipping poll #' + currentPollCount);
        return;
      }

      console.log(`🔄 Poll #${currentPollCount}/${maxPolls} - Checking payment status...`);

      try {
        const statusResult = await queryPaymentStatus(identifier);

        if (!statusResult.success || !statusResult.data) {
          console.warn(`⚠️ Status query failed on poll #${currentPollCount}/${maxPolls}`);
          
          if (currentPollCount >= maxPolls - 5) {
            throw new Error(statusResult.message || "Unable to verify payment status");
          }
          return;
        }

        const { paymentStatus: localStatus, mpesaStatus } = statusResult.data;

        const code = mpesaStatus?.ResultCode != null 
          ? String(mpesaStatus.ResultCode).trim() 
          : null;

        const desc = mpesaStatus?.ResultDesc || "Waiting for payment...";

        console.log(`🔄 Poll #${currentPollCount} result:`, {
          resultCode: code,
          resultDesc: desc,
          localStatus,
          receipt: mpesaStatus?.MpesaReceiptNumber || 'N/A'
        });

        // SUCCESS
        if (code === '0' || localStatus === 'completed') {
          isProcessing = true;

          if (pollingIntervalRef.current !== null) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          console.log('✅ PAYMENT SUCCESSFUL!');
          console.log('M-Pesa Receipt:', mpesaStatus?.MpesaReceiptNumber);

          setPaymentStatus({
            status: 'syncing',
            message: '✅ Payment successful! Syncing to router...',
            transactionId: identifier
          });

          // Start auto-login process
          await attemptAutoLogin(identifier);

          // Refresh active session
          await checkActiveSession();

          return;
        }

        // DEFINITIVE FAILURE
        const definitiveFailureCodes = ['1', '2001', '17'];
        
        if (code && definitiveFailureCodes.includes(code)) {
          isProcessing = true;

          if (pollingIntervalRef.current !== null) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          console.log('❌ Payment failed with code:', code);

          let errorMessage = desc || 'Payment failed';
          switch (code) {
            case '1':     errorMessage = 'Insufficient balance in M-Pesa account'; break;
            case '2001':  errorMessage = 'Invalid M-Pesa PIN entered'; break;
            case '17':    errorMessage = 'System error - please try again later'; break;
            default:      errorMessage = `${desc} (Code: ${code})`;
          }

          setPaymentStatus({
            status: 'failed',
            message: `❌ ${errorMessage}`,
          });
          return;
        }

        // USER CANCELLED
        if (code === '1032') {
          isProcessing = true;

          if (pollingIntervalRef.current !== null) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          console.log('⚠️ Payment cancelled by user');
          setPaymentStatus({
            status: 'cancelled',
            message: '⚠️ Payment request was cancelled',
          });
          return;
        }

        // STILL PENDING - Update message
        const secondsElapsed = currentPollCount * (pollIntervalMs / 1000);
        const minutesElapsed = Math.floor(secondsElapsed / 60);
        const remainingSeconds = secondsElapsed % 60;
        
        let timeDisplay = minutesElapsed > 0 
          ? `${minutesElapsed}m ${remainingSeconds}s`
          : `${secondsElapsed}s`;

        let userMessage = '';
        if (currentPollCount <= 12) {
          userMessage = `📱 Check your phone for M-Pesa prompt... (${timeDisplay})`;
        } else if (currentPollCount <= 36) {
          userMessage = `⏳ Waiting for you to enter your M-Pesa PIN... (${timeDisplay})`;
        } else {
          userMessage = `⏳ Still waiting for payment confirmation... (${timeDisplay})`;
        }

        setPaymentStatus(prev => ({
          ...prev,
          message: userMessage
        }));

        // TIMEOUT
        if (currentPollCount >= maxPolls) {
          isProcessing = true;

          if (pollingIntervalRef.current !== null) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          console.log('⏱️ Polling timeout reached');
          
          setPaymentStatus({
            status: 'timeout',
            message: `⏱️ Payment check timed out. Please check your M-Pesa messages.`,
          });
        }
      } catch (error) {
        console.error('❌ Status polling error on poll #' + currentPollCount + ':', error);

        if (currentPollCount >= maxPolls) {
          isProcessing = true;

          if (pollingIntervalRef.current !== null) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          setPaymentStatus({
            status: 'error',
            message: '❌ Unable to verify payment status. Please check your M-Pesa messages.',
          });
        }
      }
    }, pollIntervalMs) as any;
  };

  /**
   * Query payment status
   */
  const queryPaymentStatus = async (identifier: string): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> => {
    try {
      console.log(`🔍 Querying payment status: ${identifier}`);
      
      const response = await fetch(`${API_BASE_URL}/payment/status/${identifier}`);
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: responseData.error || 'Failed to query payment status'
        };
      }

      return {
        success: true,
        data: responseData.data || responseData
      };
      
    } catch (error: any) {
      console.error('❌ STATUS QUERY ERROR:', error);
      
      return {
        success: false,
        message: error.message || 'Failed to query payment status'
      };
    }
  };

  /**
   * Reset the payment flow
   */
  const resetFlow = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (redirectTimerRef.current) {
      clearInterval(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    if (autoLoginIntervalRef.current) {
      clearInterval(autoLoginIntervalRef.current);
      autoLoginIntervalRef.current = null;
    }
    setSelectedPackage(null);
    setPhoneNumber('');
    setVoucherCode('');
    setPaymentStatus({ status: 'idle', message: '' });
    setErrors({});
    setPollCount(0);
    setTimeElapsed(0);
    setIsVoucherMode(false);
    setRedirectCountdown(5);
    setAutoLoginAttempts(0);
  };

  /**
   * Get icon component
   */
  const getIcon = useCallback((iconName: string) => {
    switch (iconName) {
      case 'zap': return <Zap className="w-6 h-6" />;
      case 'clock': return <Clock className="w-6 h-6" />;
      case 'star': return <Star className="w-6 h-6" />;
      default: return <Wifi className="w-6 h-6" />;
    }
  }, []);

  /**
   * Format duration
   */
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    if (hours >= 24) {
      return `${hours / 24} Day${hours / 24 > 1 ? 's' : ''}`;
    }
    return `${hours} Hour${hours > 1 ? 's' : ''}`;
  }, []);

  /**
   * Format elapsed time
   */
  const formatElapsedTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                <Wifi className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ashvillecom WIFI</h1>
                <p className="text-xs text-gray-600">Loading packages...</p>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md p-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-xl mx-auto mb-3"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                <Wifi className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ashvillecom WIFI</h1>
                <p className="text-xs text-gray-600">Get instant internet access</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">Network Available</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Payment Status Modal */}
      {['initiating', 'waiting', 'syncing', 'success', 'failed', 'cancelled', 'timeout', 'error'].includes(paymentStatus.status) && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300">
            {/* Initiating State */}
            {paymentStatus.status === 'initiating' && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Sending Request...</h2>
                <p className="text-gray-600 text-base">
                  {paymentStatus.message}
                </p>
              </div>
            )}

            {/* Waiting for Payment State */}
            {paymentStatus.status === 'waiting' && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full relative">
                  <Phone className="w-10 h-10 text-green-600 animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Check Your Phone
                </h2>
                <p className="text-gray-600 text-base mb-6">
                  We've sent an M-Pesa prompt to<br />
                  <strong className="text-gray-900">{phoneNumber}</strong>
                </p>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Transaction in Progress</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{formatElapsedTime(timeElapsed)}</span>
                  </div>
                  
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Payment request sent</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="text-gray-700">Waiting for PIN entry</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-gray-600">
                      Poll #{pollCount} • {paymentStatus.message}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-900 font-medium mb-1">📱 Enter your M-Pesa PIN</p>
                  <p className="text-xs text-blue-700">Complete the payment on your phone to continue</p>
                </div>

                <button
                  onClick={resetFlow}
                  className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
                >
                  Cancel Transaction
                </button>
              </div>
            )}

            {/* Syncing State */}
            {paymentStatus.status === 'syncing' && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Syncing Voucher...</h2>
                <p className="text-gray-600 text-base mb-6">
                  {paymentStatus.message}
                </p>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Payment confirmed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Voucher created</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                      <span className="text-gray-700">Syncing to router...</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-xs text-gray-600">
                      Attempt {autoLoginAttempts}/12 • This may take up to 1 minute
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-900 font-medium mb-1">⏳ Please wait...</p>
                  <p className="text-xs text-blue-700">We're activating your internet access</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {paymentStatus.status === 'success' && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full animate-in zoom-in duration-500">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Connected! 🎉</h2>
                <p className="text-gray-600 text-base mb-6">
                  {paymentStatus.message}
                </p>

                {(selectedPackage || activeSession) && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Wifi className="w-5 h-5 text-green-600" />
                      <p className="text-gray-900 font-semibold">
                        {selectedPackage?.name || activeSession?.packageName} Package
                      </p>
                    </div>
                    {activeSession && (
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Expires: {new Date(activeSession.expiryTime).toLocaleString()}</span>
                        </div>
                        {activeSession.mikrotikActive && (
                          <div className="flex items-center justify-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Connected to Network</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Wifi className="w-5 h-5 text-blue-600 animate-pulse" />
                    <p className="text-sm font-bold text-blue-900">Redirecting to Internet</p>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    Taking you online in {redirectCountdown} seconds...
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-2xl font-bold text-blue-900">{redirectCountdown}</span>
                  </div>
                </div>

                <button
                  onClick={() => window.location.href = decodeURIComponent(linkOrig)}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg mb-2"
                >
                  Go Online Now
                </button>
                
                <button
                  onClick={resetFlow}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Stay on this page
                </button>
              </div>
            )}

            {/* Failed/Error States */}
            {(['failed', 'cancelled', 'timeout', 'error'].includes(paymentStatus.status)) && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {paymentStatus.status === 'cancelled' ? 'Payment Cancelled' : 
                   paymentStatus.status === 'timeout' ? 'Payment Timeout' :
                   paymentStatus.status === 'error' ? 'Verification Error' :
                   'Payment Failed'}
                </h2>
                <p className="text-gray-600 text-base mb-6">
                  {paymentStatus.message}
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-red-900 font-medium mb-1">
                    {paymentStatus.status === 'cancelled' 
                      ? '⚠️ Transaction was cancelled' 
                      : paymentStatus.status === 'timeout'
                      ? '⏱️ Request timed out'
                      : '❌ Transaction failed'}
                  </p>
                  <p className="text-xs text-red-700">
                    {paymentStatus.status === 'cancelled' 
                      ? 'You can try again with the same or different number' 
                      : 'Please check your details and try again'}
                  </p>
                </div>

                <button
                  onClick={resetFlow}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg mb-3"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setPaymentStatus({ status: 'idle', message: '' })}
                  className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
                >
                  Enter Different Number
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {!['success', 'waiting', 'syncing'].includes(paymentStatus.status) && (
          <>
            {/* Voucher Option Toggle */}
            {!selectedPackage && !isVoucherMode && (
              <div className="text-center mb-6">
                <button
                  onClick={() => setIsVoucherMode(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border-2 border-gray-300 hover:border-blue-500 transition-all text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  <Ticket className="w-4 h-4" />
                  Have a voucher or paid cash? Click here
                </button>
              </div>
            )}

            {/* Voucher Mode */}
            {isVoucherMode && (
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto mb-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Enter Code</h2>
                  <button
                    onClick={() => {
                      setIsVoucherMode(false);
                      setVoucherCode('');
                      setErrors(prev => ({ ...prev, voucher: undefined }));
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voucher Code or M-Pesa Code
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g., ABCD-1234 or SKHU3XY2XY)"
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.voucher ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                      }`}
                    />
                  </div>
                  {errors.voucher && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.voucher}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-600">
                    Enter your voucher code or M-Pesa transaction code
                  </p>
                </div>

                <button
                  onClick={handleVoucherRedemption}
                  disabled={!voucherCode || paymentStatus.status === 'initiating'}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-base hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paymentStatus.status === 'initiating' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-5 h-5" />
                      Activate Code
                    </>
                  )}
                </button>

                <div className="mt-4 text-center">
                  <button
                    onClick={() => setIsVoucherMode(false)}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    Back to packages
                  </button>
                </div>
              </div>
            )}

            {/* Package Selection */}
            {!selectedPackage && !isVoucherMode && (
              <div className="animate-in fade-in duration-500">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Choose Your Package</h2>
                  <p className="text-sm text-gray-600">Select the perfect plan for your needs</p>
                </div>

                {packages.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No packages available at the moment</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    {packages.map((pkg) => (
                      <PackageCard 
                        key={pkg.packageId}
                        pkg={pkg}
                        onSelect={handlePackageSelect}
                        getIcon={getIcon}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment Form */}
            {selectedPackage && !isVoucherMode && (
              <div className="animate-in fade-in duration-500">
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
                    <button
                      onClick={resetFlow}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Device Information */}
                  <div className="mb-4 p-3 rounded-xl border-2 bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-2">
                      <Laptop className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold text-blue-900">
                            Device Information
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <p className="text-xs font-mono text-blue-700">
                          MAC: {macAddress || 'Detecting...'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Selected Package Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: selectedPackage.color + '40', color: selectedPackage.color }}
                        >
                          {getIcon(selectedPackage.icon)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{selectedPackage.displayName || selectedPackage.name} Package</h3>
                          <p className="text-xs text-gray-600">
                            {selectedPackage.speedLimit} • {formatDuration(selectedPackage.duration)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{selectedPackage.price}</div>
                        <div className="text-xs text-gray-600">{selectedPackage.currency || 'KES'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      M-Pesa Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="07XX XXX XXX or 2547XX XXX XXX"
                        className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.phone}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-600">
                      Enter the M-Pesa number you want to pay with
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">M-Pesa</div>
                        <div className="text-xs text-gray-600">Instant payment via STK push</div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={initiateMpesaPayment}
                    disabled={!phoneNumber || paymentStatus.status === 'initiating'}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-base hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    {paymentStatus.status === 'initiating' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Pay {selectedPackage.price} {selectedPackage.currency || 'KES'} with M-Pesa
                      </>
                    )}
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-600">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Secure payment powered by Safaricom M-Pesa</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Device MAC:</span> {macAddress || 'Detecting...'}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Secure connection • SSL encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WifiPortalHome;