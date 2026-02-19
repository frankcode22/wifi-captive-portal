import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Wifi, Clock, Zap, Star, CheckCircle2, Loader2, AlertCircle, Phone, CreditCard, ArrowRight, X, Laptop, Shield, Ticket, Globe } from 'lucide-react';

// ============================================
// CONFIGURATION
// ============================================

const getApiBaseUrl = () => {
  // ⚠️ LOCAL DEV — change this to production URL before deploying
  return 'http://10.22.238.166:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

// ============================================
// TYPES
// ============================================

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

type PaymentMethod = 'mpesa' | 'paypal';
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

// ============================================
// PACKAGE CARD COMPONENT
// ============================================

const PackageCard = memo(({
  pkg,
  onSelect,
  getIcon,
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
        <span className="text-3xl font-bold text-gray-900">{pkg.price}</span>
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

// ============================================
// PAYPAL LOGO SVG
// ============================================

const PayPalLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.117 3.278-.67 6.423-5.07 6.423h-2.19l-1.177 7.456h3.492c.457 0 .846-.334.917-.789l.038-.202.734-4.648.047-.258a.926.926 0 0 1 .917-.789h.578c3.74 0 6.668-1.52 7.524-5.914.36-1.847.174-3.39-.703-4.738z" fill="#003087"/>
    <path d="M6.26 7.927l.5-3.178.112-.71H3.104L.6 20.596h3.49l1.12-7.106a1.07 1.07 0 0 1 1.05-.9h2.19c4.298 0 7.664-1.748 8.647-6.797.03-.15.054-.294.077-.437-1.247-.658-2.747-.98-4.614-.98H7.076c-.524 0-.969.381-1.05.9l-.766 2.651z" fill="#009cde"/>
  </svg>
);

// ============================================
// MAIN COMPONENT
// ============================================

const WifiPortalHome: React.FC = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [packages, setPackages] = useState<Package[]>(() => {
    try {
      const cached = sessionStorage.getItem('wifi_packages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 300000) return parsed.data;
      }
    } catch (e) {}
    return [];
  });

  const [selectedPackage, setSelectedPackage]     = useState<Package | null>(null);
  const [phoneNumber, setPhoneNumber]             = useState('');
  const [voucherCode, setVoucherCode]             = useState('');
  const [paymentMethod, setPaymentMethod]         = useState<PaymentMethod>('mpesa');
  const [paymentStatus, setPaymentStatus]         = useState<PaymentStatus>({ status: 'idle', message: '' });
  const [errors, setErrors]                       = useState<{ phone?: string; mac?: string; voucher?: string }>({});
  const [macAddress, setMacAddress]               = useState('');
  const [loading, setLoading]                     = useState(packages.length === 0);
  const [pollCount, setPollCount]                 = useState(0);
  const [timeElapsed, setTimeElapsed]             = useState(0);
  const [isVoucherMode, setIsVoucherMode]         = useState(false);
  const [activeSession, setActiveSession]         = useState<SessionData | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [autoLoginAttempts, setAutoLoginAttempts] = useState(0);

  const pollingIntervalRef   = useRef<number | null>(null);
  const redirectTimerRef     = useRef<number | null>(null);
  const fetchControllerRef   = useRef<AbortController | null>(null);
  const autoLoginIntervalRef = useRef<number | null>(null);
  const paypalWindowRef      = useRef<Window | null>(null);
  const paypalPollRef        = useRef<number | null>(null);

  const urlParams  = new URLSearchParams(window.location.search);
  const linkLogin  = urlParams.get('link-login') || urlParams.get('link-login-only') || '';
  const linkOrig   = urlParams.get('link-orig') || urlParams.get('dst') || 'http://www.google.com';

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const mac = getMacAddressSync();
    setMacAddress(mac);
    Promise.all([fetchPackages(), checkActiveSession(mac)]).catch(console.error);
  }, []);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = API_BASE_URL;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    let timer: number;
    if (paymentStatus.status === 'waiting') {
      timer = setInterval(() => setTimeElapsed(prev => prev + 1), 1000) as any;
    } else {
      setTimeElapsed(0);
    }
    return () => clearInterval(timer);
  }, [paymentStatus.status]);

  useEffect(() => {
    if (paymentStatus.status === 'success') {
      setRedirectCountdown(5);
      redirectTimerRef.current = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            window.location.href = decodeURIComponent(linkOrig);
            return 0;
          }
          return prev - 1;
        });
      }, 1000) as any;
    }
    return () => {
      if (redirectTimerRef.current) { clearInterval(redirectTimerRef.current); redirectTimerRef.current = null; }
    };
  }, [paymentStatus.status, linkOrig]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current)   clearInterval(pollingIntervalRef.current);
      if (redirectTimerRef.current)     clearInterval(redirectTimerRef.current);
      if (autoLoginIntervalRef.current) clearInterval(autoLoginIntervalRef.current);
      if (paypalPollRef.current)        clearInterval(paypalPollRef.current);
      if (paypalWindowRef.current && !paypalWindowRef.current.closed) paypalWindowRef.current.close();
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getMacAddressSync = (): string => {
    let mac =
      urlParams.get('mac') ||
      urlParams.get('id') ||
      urlParams.get('client-mac-address') ||
      urlParams.get('username') ||
      '';
    if (mac.startsWith('$(') && mac.endsWith(')')) { console.warn('⚠️ MikroTik variable not replaced:', mac); mac = ''; }
    mac = decodeURIComponent(mac);
    // Fallback: mock MAC for local testing when MikroTik params aren't present
    if (!mac) {
      const mockMac = 'AA:BB:CC:DD:EE:FF';
      console.warn('No MAC in URL - using mock MAC for testing:', mockMac);
      return mockMac;
    }
    return mac;
  };

  const checkActiveSession = async (mac?: string) => {
    const macToUse = mac || macAddress;
    if (!macToUse) return;
    try {
      const cached = sessionStorage.getItem(`session_${macToUse}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30000) { setActiveSession(parsed.data); return; }
      }
    } catch (e) {}
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${API_BASE_URL}/sessions/active/${macToUse}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const result: ApiResponse<SessionData> = await response.json();
      if (result.success && result.data) {
        setActiveSession(result.data);
        sessionStorage.setItem(`session_${macToUse}`, JSON.stringify({ data: result.data, timestamp: Date.now() }));
      } else {
        setActiveSession(null);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') console.error('❌ Error checking active session:', error);
      setActiveSession(null);
    }
  };

  const fetchPackages = async () => {
    if (packages.length > 0) { setLoading(false); return; }
    try {
      setLoading(true);
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
      fetchControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => fetchControllerRef.current?.abort(), 5000);
      const response = await fetch(`${API_BASE_URL}/packages`, { signal: fetchControllerRef.current.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(timeoutId);
      const result: ApiResponse<Package[]> = await response.json();
      if (result.success && result.data) {
        const mappedPackages = result.data.map(pkg => ({
          ...pkg,
          features: Array.isArray(pkg.features) ? pkg.features : typeof pkg.features === 'string' ? JSON.parse(pkg.features) : [],
          icon:  pkg.icon  || getDefaultIcon(pkg.packageId),
          color: pkg.color || getDefaultColor(pkg.packageId),
          displayName: pkg.displayName || pkg.name,
        }));
        setPackages(mappedPackages);
        try { sessionStorage.setItem('wifi_packages', JSON.stringify({ data: mappedPackages, timestamp: Date.now() })); } catch (e) {}
      } else {
        setFallbackPackages();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') { console.error('❌ Error fetching packages:', error); setFallbackPackages(); }
    } finally {
      setLoading(false);
    }
  };

  const setFallbackPackages = () => {
    setPackages([
      { packageId: '1h',  name: '1 Hour',  duration: 3600,  price: 10, speedLimit: '1M/1M', features: ['1 hour access', 'Basic speed'],    icon: 'zap',   color: '#F59E0B' },
      { packageId: '2h',  name: '2 Hours', duration: 7200,  price: 15, speedLimit: '2M/2M', features: ['2 hours access', 'Standard speed'], icon: 'clock', color: '#3B82F6' },
      { packageId: '24h', name: '24 Hours',duration: 86400, price: 50, speedLimit: '5M/5M', features: ['Full day access', 'High speed'],    icon: 'star',  color: '#10B981', isFeatured: true },
    ]);
  };

  const getDefaultIcon  = (id: string) => id.includes('24') || id.includes('day') ? 'star' : id.includes('2') ? 'clock' : 'zap';
  const getDefaultColor = (id: string) => id.includes('24') || id.includes('day') ? '#10B981' : id.includes('2') ? '#3B82F6' : '#F59E0B';

  const validatePhoneNumber = (phone: string): boolean => {
    const kenyanPhoneRegex = /^(?:254|\+254|0)?([17]\d{8})$/;
    if (!kenyanPhoneRegex.test(phone)) {
      setErrors(prev => ({ ...prev, phone: 'Please enter a valid Kenyan phone number (e.g., 0712345678)' }));
      return false;
    }
    setErrors(prev => ({ ...prev, phone: undefined }));
    return true;
  };

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
    if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
    return cleaned;
  };

  const handlePackageSelect = useCallback((pkg: Package) => {
    setSelectedPackage(pkg);
    setPaymentStatus({ status: 'idle', message: '' });
    setIsVoucherMode(false);
  }, []);

  const getIcon = useCallback((iconName: string) => {
    switch (iconName) {
      case 'zap':   return <Zap   className="w-6 h-6" />;
      case 'clock': return <Clock className="w-6 h-6" />;
      case 'star':  return <Star  className="w-6 h-6" />;
      default:      return <Wifi  className="w-6 h-6" />;
    }
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    if (hours >= 24) return `${hours / 24} Day${hours / 24 > 1 ? 's' : ''}`;
    return `${hours} Hour${hours > 1 ? 's' : ''}`;
  }, []);

  const formatElapsedTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // ── Auto-login & MikroTik ──────────────────────────────────────────────────

  const attemptAutoLogin = async (transactionId: string, method: PaymentMethod = 'mpesa') => {
    console.log('🔐 Starting auto-login process...');
    setPaymentStatus({ status: 'syncing', message: '🔄 Syncing voucher to router...' });

    let attempts = 0;
    const maxAttempts = 12;

    if (autoLoginIntervalRef.current) { clearInterval(autoLoginIntervalRef.current); autoLoginIntervalRef.current = null; }

    const endpoint = method === 'paypal' ? `${API_BASE_URL}/paypal/auto-login` : `${API_BASE_URL}/payment/auto-login`;

    autoLoginIntervalRef.current = setInterval(async () => {
      attempts++;
      setAutoLoginAttempts(attempts);
      console.log(`🔐 Auto-login attempt ${attempts}/${maxAttempts}`);

      if (attempts > maxAttempts) {
        if (autoLoginIntervalRef.current) { clearInterval(autoLoginIntervalRef.current); autoLoginIntervalRef.current = null; }
        setPaymentStatus({ status: 'success', message: '✅ Payment successful! Your voucher is being synced. Please check your internet connection in a moment.' });
        return;
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ macAddress, transactionId }),
        });
        const data = await response.json();

        if (data.success && data.data) {
          if (autoLoginIntervalRef.current) { clearInterval(autoLoginIntervalRef.current); autoLoginIntervalRef.current = null; }
          await loginToMikroTik(data.data);
          return;
        } else if (response.status === 202) {
          setPaymentStatus({ status: 'syncing', message: `⏳ Syncing voucher to router... (${attempts}/${maxAttempts})` });
        } else {
          if (attempts >= maxAttempts) {
            if (autoLoginIntervalRef.current) { clearInterval(autoLoginIntervalRef.current); autoLoginIntervalRef.current = null; }
            setPaymentStatus({ status: 'failed', message: `❌ Router not responding. Error: ${data.error || 'Sync timeout'}. Please contact support.` });
          }
        }
      } catch (error: any) {
        if (attempts >= maxAttempts) {
          if (autoLoginIntervalRef.current) { clearInterval(autoLoginIntervalRef.current); autoLoginIntervalRef.current = null; }
          setPaymentStatus({ status: 'failed', message: '❌ Unable to connect to router. Please contact support or try manual login with your voucher code.' });
        } else {
          setPaymentStatus({ status: 'syncing', message: `⏳ Router connection issue, retrying... (${attempts}/${maxAttempts})` });
        }
      }
    }, 5000) as any;
  };

  const loginToMikroTik = async (credentials: AutoLoginData) => {
    try {
      if (!linkLogin) {
        setPaymentStatus({ status: 'success', message: `✅ Payment successful! Your voucher code is: ${credentials.voucherCode}` });
        return;
      }
      const loginUrl = new URL(linkLogin);
      loginUrl.searchParams.set('username', credentials.username);
      loginUrl.searchParams.set('password', credentials.password);
      await fetch(loginUrl.href, { method: 'GET', mode: 'no-cors' });
      setPaymentStatus({ status: 'success', message: '✅ Login successful! You are now connected to the internet.' });
    } catch (error) {
      setPaymentStatus({ status: 'success', message: `✅ Payment successful! Your voucher code is: ${credentials.voucherCode}` });
    }
  };

  // ── M-Pesa ─────────────────────────────────────────────────────────────────

  const initiateMpesaPayment = async () => {
    if (!selectedPackage || !phoneNumber.trim()) return;
    if (!validatePhoneNumber(phoneNumber)) return;

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (formattedPhone.length !== 12 || !/^(2547|2541)[0-9]{8}$/.test(formattedPhone)) {
      alert('Please enter a valid Kenyan mobile number');
      return;
    }

    try {
      setPaymentStatus({ status: 'initiating', message: '📤 Sending payment request...' });
      setPollCount(0);

      const response = await fetch(`${API_BASE_URL}/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ macAddress, phoneNumber: formattedPhone, package: selectedPackage.packageId, paymentMethod: 'mpesa' }),
      });

      const responseText = await response.text();
      let responseData: any;
      try { responseData = JSON.parse(responseText); } catch { throw new Error('Invalid JSON response from server'); }

      if (response.status === 429) throw new Error(`Please wait ${responseData.retryAfter || 30} seconds before trying again`);

      const checkoutRequestID = responseData?.data?.checkoutRequestId || responseData?.data?.CheckoutRequestID || responseData?.checkoutRequestId || null;
      const sessionId = responseData?.data?.sessionId || responseData?.sessionId || null;

      if (checkoutRequestID) {
        setPaymentStatus({
          status: 'waiting',
          message: responseData?.data?.customerMessage || '📱 Check your phone for the M-Pesa prompt and enter your PIN',
          checkoutRequestID,
          sessionId,
          transactionId: sessionId,
        });
        pollPaymentStatus(sessionId || checkoutRequestID);
        return;
      }

      if (response.status === 409 && (checkoutRequestID || sessionId)) {
        setPaymentStatus({ status: 'waiting', message: '⏳ Previous payment request detected. Checking status...', checkoutRequestID, sessionId, transactionId: sessionId });
        pollPaymentStatus(sessionId || checkoutRequestID);
        return;
      }

      throw new Error(responseData?.message || responseData?.error || 'Failed to initiate M-Pesa payment.');
    } catch (err: any) {
      setPaymentStatus({ status: 'failed', message: `❌ ${err.message || 'Failed to initiate M-Pesa payment.'}` });
      alert(err.message);
    }
  };

  const pollPaymentStatus = (identifier: string) => {
    if (pollingIntervalRef.current !== null) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }

    let currentPollCount = 0;
    const maxPolls = 60;
    let isProcessing = false;

    pollingIntervalRef.current = setInterval(async () => {
      currentPollCount++;
      setPollCount(currentPollCount);
      if (isProcessing) return;

      try {
        const response = await fetch(`${API_BASE_URL}/payment/status/${identifier}`);
        const responseData = await response.json();
        if (!response.ok) { if (currentPollCount >= maxPolls - 5) throw new Error(responseData.error || 'Status query failed'); return; }

        const { paymentStatus: localStatus, mpesaStatus } = responseData.data || responseData;
        const code = mpesaStatus?.ResultCode != null ? String(mpesaStatus.ResultCode).trim() : null;
        const desc = mpesaStatus?.ResultDesc || 'Waiting for payment...';

        if (code === '0' || localStatus === 'completed') {
          isProcessing = true;
          if (pollingIntervalRef.current !== null) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
          setPaymentStatus({ status: 'syncing', message: '✅ Payment successful! Syncing to router...', transactionId: identifier });
          await attemptAutoLogin(identifier, 'mpesa');
          await checkActiveSession();
          return;
        }

        if (code && ['1', '2001', '17'].includes(code)) {
          isProcessing = true;
          if (pollingIntervalRef.current !== null) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
          const msgs: Record<string, string> = { '1': 'Insufficient balance in M-Pesa account', '2001': 'Invalid M-Pesa PIN entered', '17': 'System error - please try again later' };
          setPaymentStatus({ status: 'failed', message: `❌ ${msgs[code] || desc}` });
          return;
        }

        if (code === '1032') {
          isProcessing = true;
          if (pollingIntervalRef.current !== null) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
          setPaymentStatus({ status: 'cancelled', message: '⚠️ Payment request was cancelled' });
          return;
        }

        const secondsElapsed = currentPollCount * 5;
        const minutesElapsed = Math.floor(secondsElapsed / 60);
        const timeDisplay = minutesElapsed > 0 ? `${minutesElapsed}m ${secondsElapsed % 60}s` : `${secondsElapsed}s`;
        setPaymentStatus(prev => ({
          ...prev,
          message: currentPollCount <= 12
            ? `📱 Check your phone for M-Pesa prompt... (${timeDisplay})`
            : `⏳ Waiting for M-Pesa PIN... (${timeDisplay})`,
        }));

        if (currentPollCount >= maxPolls) {
          isProcessing = true;
          if (pollingIntervalRef.current !== null) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
          setPaymentStatus({ status: 'timeout', message: '⏱️ Payment check timed out. Please check your M-Pesa messages.' });
        }
      } catch (error) {
        if (currentPollCount >= maxPolls) {
          isProcessing = true;
          if (pollingIntervalRef.current !== null) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
          setPaymentStatus({ status: 'error', message: '❌ Unable to verify payment status. Please check your M-Pesa messages.' });
        }
      }
    }, 5000) as any;
  };

  // ── PayPal ─────────────────────────────────────────────────────────────────

  const initiatePayPalPayment = async () => {
    if (!selectedPackage) return;

    try {
      setPaymentStatus({ status: 'initiating', message: '🌐 Creating PayPal order...' });

      const response = await fetch(`${API_BASE_URL}/paypal/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ macAddress, packageId: selectedPackage.packageId, currency: 'USD' }),
      });

      if (response.status === 429) {
        const data = await response.json();
        throw new Error(`Please wait ${data.retryAfter || 30} seconds before trying again`);
      }

      const responseData = await response.json();

      // Handle duplicate (existing in-progress payment)
      if (response.status === 409 && responseData.data?.orderId) {
        openPayPalWindow(responseData.data.approvalUrl, responseData.data.orderId, responseData.data.sessionId);
        return;
      }

      if (!responseData.success || !responseData.data?.approvalUrl) {
        throw new Error(responseData.error || 'Failed to create PayPal order');
      }

      const { approvalUrl, orderId, sessionId } = responseData.data;
      openPayPalWindow(approvalUrl, orderId, sessionId);

    } catch (err: any) {
      setPaymentStatus({ status: 'failed', message: `❌ ${err.message || 'Failed to initiate PayPal payment.'}` });
      alert(err.message);
    }
  };

  const openPayPalWindow = (approvalUrl: string, orderId: string, sessionId: string) => {
    const identifier = sessionId || orderId;
    const width = 500, height = 650;
    const left  = window.screenX + (window.outerWidth  - width)  / 2;
    const top   = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(approvalUrl, 'PayPalPayment', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`);
    paypalWindowRef.current = popup;

    setPaymentStatus({
      status: 'waiting',
      message: '🌐 Complete your payment in the PayPal window that opened',
      transactionId: identifier,
    });

    // ── Listen for postMessage from the success/cancel page ──────────────────
    const handleMessage = async (event: MessageEvent) => {
      const { type, transactionId: txId } = event.data || {};

      if (type === 'PAYPAL_PAYMENT_SUCCESS') {
        window.removeEventListener('message', handleMessage);
        if (paypalPollRef.current) { clearInterval(paypalPollRef.current); paypalPollRef.current = null; }
        if (popup && !popup.closed) popup.close();
        console.log('✅ postMessage: PayPal payment success received');
        setPaymentStatus({ status: 'syncing', message: '✅ Payment confirmed! Syncing to router...', transactionId: identifier });
        await attemptAutoLogin(identifier, 'paypal');
        await checkActiveSession();
      }

      if (type === 'PAYPAL_PAYMENT_FAILED') {
        window.removeEventListener('message', handleMessage);
        if (paypalPollRef.current) { clearInterval(paypalPollRef.current); paypalPollRef.current = null; }
        if (popup && !popup.closed) popup.close();
        console.log('❌ postMessage: PayPal payment failed');
        setPaymentStatus({ status: 'failed', message: '❌ PayPal payment failed. Please try again.' });
      }

      if (type === 'PAYPAL_PAYMENT_CANCELLED') {
        window.removeEventListener('message', handleMessage);
        if (paypalPollRef.current) { clearInterval(paypalPollRef.current); paypalPollRef.current = null; }
        if (popup && !popup.closed) popup.close();
        console.log('⚠️ postMessage: PayPal payment cancelled');
        setPaymentStatus({ status: 'cancelled', message: '⚠️ PayPal payment was cancelled.' });
      }
    };

    window.addEventListener('message', handleMessage);

    // ── Fallback polling (in case postMessage fails e.g. popup blocker) ──────
    let ppPolls = 0;
    const maxPpPolls = 72; // 6 minutes

    if (paypalPollRef.current) { clearInterval(paypalPollRef.current); paypalPollRef.current = null; }

    paypalPollRef.current = setInterval(async () => {
      ppPolls++;

      // Popup closed — do one final status check
      if (popup && popup.closed) {
        if (paypalPollRef.current) { clearInterval(paypalPollRef.current); paypalPollRef.current = null; }
        window.removeEventListener('message', handleMessage);
        try {
          const finalResp = await fetch(`${API_BASE_URL}/paypal/status/${identifier}`);
          const finalData = await finalResp.json();
          if (finalData.data?.paymentStatus === 'completed') {
            setPaymentStatus({ status: 'syncing', message: '✅ Payment confirmed! Syncing to router...', transactionId: identifier });
            await attemptAutoLogin(identifier, 'paypal');
            await checkActiveSession();
          } else {
            setPaymentStatus({ status: 'cancelled', message: '⚠️ PayPal window closed. Payment was not completed.' });
          }
        } catch {
          setPaymentStatus({ status: 'cancelled', message: '⚠️ PayPal window closed. Payment was not completed.' });
        }
        return;
      }

      // Timeout
      if (ppPolls >= maxPpPolls) {
        if (paypalPollRef.current) { clearInterval(paypalPollRef.current); paypalPollRef.current = null; }
        window.removeEventListener('message', handleMessage);
        if (popup && !popup.closed) popup.close();
        setPaymentStatus({ status: 'timeout', message: '⏱️ PayPal payment timed out. Please try again.' });
      }
    }, 5000) as any;
  };

  // ── Voucher ────────────────────────────────────────────────────────────────

  const handleVoucherRedemption = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) { setErrors(prev => ({ ...prev, voucher: 'Please enter a voucher code' })); return; }

    try {
      setPaymentStatus({ status: 'initiating', message: '🎟️ Validating voucher code...' });
      setErrors(prev => ({ ...prev, voucher: undefined }));

      const response = await fetch(`${API_BASE_URL}/voucher/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ voucherCode: code, macAddress }),
      });

      const responseData = await response.json();

      if (response.status === 202) { setPaymentStatus({ status: 'syncing', message: `⏳ ${responseData.error || 'Voucher is being activated...'}` }); setTimeout(() => handleVoucherRedemption(), 5000); return; }
      if (response.status === 409) throw new Error(responseData.error || 'Voucher already used by another device');
      if (response.status === 410) throw new Error(responseData.error || 'Voucher has expired');
      if (!response.ok || !responseData.success) throw new Error(responseData.error || 'Invalid voucher code');

      setPaymentStatus({ status: 'syncing', message: '✅ Voucher activated! Logging you in...' });

      if (responseData.data?.voucherCode) {
        await loginToMikroTik({
          username:    responseData.data.voucherCode,
          password:    responseData.data.voucherCode,
          voucherCode: responseData.data.voucherCode,
          profile:     responseData.data.profile   || 'default',
          duration:    responseData.data.duration  || '1:00:00',
          expiryDate:  responseData.data.expiryDate || new Date().toISOString(),
        });
      } else {
        setPaymentStatus({ status: 'success', message: `✅ Voucher activated! Code: ${code}` });
      }

      await checkActiveSession();
    } catch (error: any) {
      const msg = error.message || 'Failed to redeem voucher';
      setPaymentStatus({ status: 'failed', message: `❌ ${msg}` });
      setErrors(prev => ({ ...prev, voucher: msg }));
    }
  };

  // ── Payment dispatcher ─────────────────────────────────────────────────────

  const handlePayment = () => {
    if (paymentMethod === 'paypal') {
      initiatePayPalPayment();
    } else {
      initiateMpesaPayment();
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetFlow = () => {
    if (pollingIntervalRef.current)   { clearInterval(pollingIntervalRef.current);   pollingIntervalRef.current = null; }
    if (redirectTimerRef.current)     { clearInterval(redirectTimerRef.current);     redirectTimerRef.current = null; }
    if (autoLoginIntervalRef.current) { clearInterval(autoLoginIntervalRef.current); autoLoginIntervalRef.current = null; }
    if (paypalPollRef.current)        { clearInterval(paypalPollRef.current);         paypalPollRef.current = null; }
    if (paypalWindowRef.current && !paypalWindowRef.current.closed) paypalWindowRef.current.close();

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
    setPaymentMethod('mpesa');
  };

  // ── Loading UI ─────────────────────────────────────────────────────────────

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
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-md p-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-xl mx-auto mb-3" />
                <div className="h-6 bg-gray-200 rounded mb-2" />
                <div className="h-8 bg-gray-200 rounded mb-4" />
                <div className="space-y-2 mb-4"><div className="h-4 bg-gray-200 rounded" /><div className="h-4 bg-gray-200 rounded" /></div>
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────

  const isPaymentInProgress = ['initiating', 'waiting', 'syncing', 'success', 'failed', 'cancelled', 'timeout', 'error'].includes(paymentStatus.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">

      {/* ── Header ── */}
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700">Network Available</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Payment Status Modal ── */}
      {isPaymentInProgress && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">

            {/* Initiating */}
            {paymentStatus.status === 'initiating' && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {paymentMethod === 'paypal' ? 'Creating Order...' : 'Sending Request...'}
                </h2>
                <p className="text-gray-600 text-base">{paymentStatus.message}</p>
              </div>
            )}

            {/* Waiting — M-Pesa */}
            {paymentStatus.status === 'waiting' && paymentMethod === 'mpesa' && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full relative">
                  <Phone className="w-10 h-10 text-green-600 animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Phone</h2>
                <p className="text-gray-600 text-base mb-6">
                  We've sent an M-Pesa prompt to<br />
                  <strong className="text-gray-900">{phoneNumber}</strong>
                </p>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-gray-700">Transaction in Progress</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{formatElapsedTime(timeElapsed)}</span>
                  </div>
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-gray-700">Payment request sent</span></div>
                    <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 text-blue-600 animate-spin" /><span className="text-gray-700">Waiting for PIN entry</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-gray-600">Poll #{pollCount} • {paymentStatus.message}</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-900 font-medium mb-1">📱 Enter your M-Pesa PIN</p>
                  <p className="text-xs text-blue-700">Complete the payment on your phone to continue</p>
                </div>
                <button onClick={resetFlow} className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors">Cancel Transaction</button>
              </div>
            )}

            {/* Waiting — PayPal */}
            {paymentStatus.status === 'waiting' && paymentMethod === 'paypal' && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full relative">
                  <Globe className="w-10 h-10 text-blue-600 animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-ping" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Complete PayPal Payment</h2>
                <p className="text-gray-600 text-base mb-6">
                  A PayPal window has opened.<br />
                  <span className="text-sm">Complete your payment there to continue.</span>
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-gray-700">Order created</span></div>
                    <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 text-blue-600 animate-spin" /><span className="text-gray-700">Waiting for PayPal approval...</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-gray-600">{paymentStatus.message}</p>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-900 font-medium mb-1">💡 Don't see the PayPal window?</p>
                  <p className="text-xs text-yellow-700">Check if your browser blocked the popup, then allow it and try again.</p>
                </div>
                <button onClick={resetFlow} className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors">Cancel Transaction</button>
              </div>
            )}

            {/* Syncing */}
            {paymentStatus.status === 'syncing' && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Syncing Voucher...</h2>
                <p className="text-gray-600 text-base mb-6">{paymentStatus.message}</p>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-gray-700">Payment confirmed</span></div>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-gray-700">Voucher created</span></div>
                    <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 text-purple-600 animate-spin" /><span className="text-gray-700">Syncing to router...</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-xs text-gray-600">Attempt {autoLoginAttempts}/12 • This may take up to 1 minute</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900 font-medium mb-1">⏳ Please wait...</p>
                  <p className="text-xs text-blue-700">We're activating your internet access</p>
                </div>
              </div>
            )}

            {/* Success */}
            {paymentStatus.status === 'success' && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Connected! 🎉</h2>
                <p className="text-gray-600 text-base mb-6">{paymentStatus.message}</p>
                {(selectedPackage || activeSession) && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Wifi className="w-5 h-5 text-green-600" />
                      <p className="text-gray-900 font-semibold">{selectedPackage?.name || activeSession?.packageName} Package</p>
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
                  <p className="text-xs text-blue-700 mb-3">Taking you online in {redirectCountdown} seconds...</p>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-2xl font-bold text-blue-900">{redirectCountdown}</span>
                  </div>
                </div>
                <button onClick={() => window.location.href = decodeURIComponent(linkOrig)} className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg mb-2">Go Online Now</button>
                <button onClick={resetFlow} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Stay on this page</button>
              </div>
            )}

            {/* Failed / Cancelled / Timeout / Error */}
            {(['failed', 'cancelled', 'timeout', 'error'].includes(paymentStatus.status)) && (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {paymentStatus.status === 'cancelled' ? 'Payment Cancelled' :
                   paymentStatus.status === 'timeout'   ? 'Payment Timeout' :
                   paymentStatus.status === 'error'     ? 'Verification Error' : 'Payment Failed'}
                </h2>
                <p className="text-gray-600 text-base mb-6">{paymentStatus.message}</p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-red-900 font-medium mb-1">
                    {paymentStatus.status === 'cancelled' ? '⚠️ Transaction was cancelled' :
                     paymentStatus.status === 'timeout'   ? '⏱️ Request timed out' : '❌ Transaction failed'}
                  </p>
                  <p className="text-xs text-red-700">
                    {paymentStatus.status === 'cancelled' ? 'You can try again with the same or different method' : 'Please check your details and try again'}
                  </p>
                </div>
                <button onClick={resetFlow} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg mb-3">Try Again</button>
                <button onClick={() => setPaymentStatus({ status: 'idle', message: '' })} className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors">Choose Different Method</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {!['success', 'waiting', 'syncing'].includes(paymentStatus.status) && (
          <>
            {/* Voucher toggle */}
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
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Enter Code</h2>
                  <button onClick={() => { setIsVoucherMode(false); setVoucherCode(''); setErrors(prev => ({ ...prev, voucher: undefined })); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Code</label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g., ABCD-1234)"
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.voucher ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`}
                    />
                  </div>
                  {errors.voucher && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.voucher}</p>}
                </div>
                <button
                  onClick={handleVoucherRedemption}
                  disabled={!voucherCode || paymentStatus.status === 'initiating'}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paymentStatus.status === 'initiating' ? (<><Loader2 className="w-5 h-5 animate-spin" />Validating...</>) : (<><Ticket className="w-5 h-5" />Activate Code</>)}
                </button>
                <div className="mt-4 text-center">
                  <button onClick={() => setIsVoucherMode(false)} className="text-sm text-gray-600 hover:text-gray-700">Back to packages</button>
                </div>
              </div>
            )}

            {/* Package Selection */}
            {!selectedPackage && !isVoucherMode && (
              <div>
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
                    {packages.map(pkg => (
                      <PackageCard key={pkg.packageId} pkg={pkg} onSelect={handlePackageSelect} getIcon={getIcon} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment Form */}
            {selectedPackage && !isVoucherMode && (
              <div>
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
                    <button onClick={resetFlow} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Device Info */}
                  <div className="mb-4 p-3 rounded-xl border-2 bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-2">
                      <Laptop className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold text-blue-900">Device Information</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <p className="text-xs font-mono text-blue-700">MAC: {macAddress || 'Detecting...'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Package Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: selectedPackage.color + '40', color: selectedPackage.color }}>
                          {getIcon(selectedPackage.icon)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{selectedPackage.displayName || selectedPackage.name} Package</h3>
                          <p className="text-xs text-gray-600">{selectedPackage.speedLimit} • {formatDuration(selectedPackage.duration)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{selectedPackage.price}</div>
                        <div className="text-xs text-gray-600">{selectedPackage.currency || 'KES'}</div>
                      </div>
                    </div>
                  </div>

                  {/* ── Payment Method Selector ── */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">

                      {/* M-Pesa option */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('mpesa')}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                          paymentMethod === 'mpesa'
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                        }`}
                      >
                        {paymentMethod === 'mpesa' && (
                          <span className="absolute top-2 right-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </span>
                        )}
                        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-gray-900 text-sm">M-Pesa</div>
                          <div className="text-xs text-gray-500">STK Push • KES</div>
                        </div>
                      </button>

                      {/* PayPal option */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('paypal')}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                          paymentMethod === 'paypal'
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        {paymentMethod === 'paypal' && (
                          <span className="absolute top-2 right-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          </span>
                        )}
                        <div className="w-10 h-10 bg-[#003087] rounded-lg flex items-center justify-center">
                          <PayPalLogo />
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-gray-900 text-sm">PayPal</div>
                          <div className="text-xs text-gray-500">Secure • USD</div>
                        </div>
                      </button>

                    </div>
                  </div>

                  {/* M-Pesa phone number field (only shown when M-Pesa selected) */}
                  {paymentMethod === 'mpesa' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">M-Pesa Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          placeholder="07XX XXX XXX or 2547XX XXX XXX"
                          className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`}
                        />
                      </div>
                      {errors.phone && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.phone}</p>}
                      <p className="mt-2 text-xs text-gray-600">Enter the M-Pesa number you want to pay with</p>
                    </div>
                  )}

                  {/* PayPal info banner (only shown when PayPal selected) */}
                  {paymentMethod === 'paypal' && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Pay with PayPal</p>
                          <p className="text-xs text-blue-700 mt-0.5">
                            A secure PayPal window will open. You can pay with your PayPal balance, card, or bank account.
                            Price will be charged in <strong>USD</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handlePayment}
                    disabled={
                      (paymentMethod === 'mpesa' && !phoneNumber) ||
                      paymentStatus.status === 'initiating'
                    }
                    className={`w-full py-3 text-white rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
                      paymentMethod === 'paypal'
                        ? 'bg-[#003087] hover:bg-[#002070]'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                    }`}
                  >
                    {paymentStatus.status === 'initiating' ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />Processing...</>
                    ) : paymentMethod === 'paypal' ? (
                      <><PayPalLogo />Pay {selectedPackage.price} {selectedPackage.currency || 'KES'} with PayPal</>
                    ) : (
                      <><CreditCard className="w-5 h-5" />Pay {selectedPackage.price} {selectedPackage.currency || 'KES'} with M-Pesa</>
                    )}
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-600">
                    <Shield className="w-3.5 h-3.5" />
                    <span>
                      {paymentMethod === 'paypal'
                        ? 'Secure payment powered by PayPal'
                        : 'Secure payment powered by Safaricom M-Pesa'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Device MAC:</span> {macAddress || 'Detecting...'}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Secure connection • SSL encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WifiPortalHome;