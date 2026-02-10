import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Clock, Zap, Star, CheckCircle2, Loader2, AlertCircle, Phone, CreditCard, ArrowRight, X, Laptop, Shield, Timer, Ticket } from 'lucide-react';

// API Configuration
// const API_BASE_URL = 'http://localhost:3000/api';
// const API_BASE_URL = 'http://10.10.3.248:3000/api';
// const API_BASE_URL = 'http://192.168.91.195:3000/api';
const API_BASE_URL = 'http://192.168.91.195:3000/api';

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
}

type PaymentStatusType = 'idle' | 'initiating' | 'waiting' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'error';

interface PaymentStatus {
  status: PaymentStatusType;
  message: string;
  checkoutRequestID?: string;
  sessionId?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const WifiPortalHome: React.FC = () => {
  // State Management
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'idle',
    message: ''
  });
  const [errors, setErrors] = useState<{ phone?: string; mac?: string; voucher?: string }>({});
  const [macAddress, setMacAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showVoucherOption, setShowVoucherOption] = useState(false);
  const [isVoucherMode, setIsVoucherMode] = useState(false);

  const pollingIntervalRef = useRef<number | null>(null);

  // Fetch packages on mount
  useEffect(() => {
    fetchPackages();
    getMacAddress();
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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  /**
   * Fetch available packages from API
   */
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/packages`);
      const result: ApiResponse<Package[]> = await response.json();

      if (result.success && result.data) {
        const mappedPackages = result.data.map(pkg => ({
          ...pkg,
          features: Array.isArray(pkg.features) 
            ? pkg.features 
            : JSON.parse(pkg.features as any || '[]'),
          icon: pkg.icon || getDefaultIcon(pkg.packageId),
          color: pkg.color || getDefaultColor(pkg.packageId),
          name: pkg.displayName || pkg.name
        }));
        setPackages(mappedPackages);
      } else {
        console.error('Failed to fetch packages:', result.error);
        setFallbackPackages();
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      setFallbackPackages();
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
    if (packageId.includes('24')) return 'star';
    if (packageId.includes('2')) return 'clock';
    return 'zap';
  };

  const getDefaultColor = (packageId: string): string => {
    if (packageId.includes('24')) return '#10B981';
    if (packageId.includes('2')) return '#3B82F6';
    return '#F59E0B';
  };

  /**
   * Get MAC address from URL parameters
   */
  const getMacAddress = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mac = urlParams.get('mac') || urlParams.get('id') || '84:D4:37:D1:U8:64';
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 MAC ADDRESS DETECTION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('URL:', window.location.href);
    console.log('Detected MAC:', mac);
    console.log('═══════════════════════════════════════════════════════');
    
    setMacAddress(mac);
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
  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPaymentStatus({ status: 'idle', message: '' });
    setIsVoucherMode(false);
  };

  /**
   * Handle voucher redemption
   */
  const handleVoucherRedemption = async () => {
    if (!voucherCode.trim()) {
      setErrors(prev => ({ ...prev, voucher: 'Please enter a voucher code' }));
      return;
    }

    try {
      setPaymentStatus({ status: 'initiating', message: '🎟️ Validating voucher...' });
      setErrors(prev => ({ ...prev, voucher: undefined }));

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎟️ FRONTEND: Redeeming voucher');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Voucher Code:', voucherCode);
      console.log('MAC Address:', macAddress);

      const response = await fetch(`${API_BASE_URL}/voucher/redeem`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          voucherCode: voucherCode.trim(),
          macAddress
        })
      });

      const responseData = await response.json();
      console.log('Voucher Response:', responseData);

      if (responseData.success) {
        setPaymentStatus({
          status: 'success',
          message: `✅ Voucher activated! You're now connected.`,
        });

        setTimeout(() => {
          resetFlow();
        }, 3000);
      } else {
        throw new Error(responseData.error || 'Invalid or expired voucher');
      }
    } catch (error: any) {
      console.error('❌ Voucher redemption error:', error);
      const errorMessage = error.message || 'Failed to redeem voucher';
      
      setPaymentStatus({
        status: 'failed',
        message: `❌ ${errorMessage}`
      });
      
      setErrors(prev => ({ ...prev, voucher: errorMessage }));
    }
  };

  /**
   * Initiate M-Pesa payment (using working code pattern)
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

    const amount = selectedPackage.price;
    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (formattedPhone.length !== 12 || !/^(2547|2541)[0-9]{8}$/.test(formattedPhone)) {
      alert("Please enter a valid Kenyan mobile number (e.g. 0712345678 or 254712345678)");
      return;
    }

    if (amount < 1 || amount > 150000) {
      alert("Payment amount must be between KES 1 and KES 150,000");
      return;
    }

    try {
      setPaymentStatus({ status: 'initiating', message: '📤 Sending payment request to M-Pesa...' });
      setPollCount(0);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 FRONTEND: Initiating M-Pesa payment');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Phone:', formattedPhone);
      console.log('Amount:', Math.round(amount));
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

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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

      // Defensive parsing - handle multiple possible response structures
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

      const isSuccess = 
        response.status === 200 || 
        response.status === 201 ||
        responseData?.success === true ||
        responseData?.success === 'true' ||
        !!checkoutRequestID;

      console.log('Parsed values:', {
        checkoutRequestID,
        sessionId,
        isSuccess,
        responseSuccess: responseData?.success,
        httpStatus: response.status
      });

      // SUCCESS PATH - We got a CheckoutRequestID
      if (checkoutRequestID) {
        console.log('✅ SUCCESS: CheckoutRequestID received:', checkoutRequestID);
        console.log('🔄 Starting payment status polling...');

        const customerMessage = 
          responseData?.data?.customerMessage ||
          responseData?.customerMessage ||
          responseData?.data?.message ||
          responseData?.message ||
          "📱 Check your phone for the M-Pesa prompt and enter your PIN";

        setPaymentStatus({
          status: 'waiting',
          message: customerMessage,
          checkoutRequestID,
          sessionId
        });

        // Start polling for payment status
        pollPaymentStatus(sessionId || checkoutRequestID);
        return;
      }

      // DUPLICATE REQUEST (409) - Continue with existing CheckoutRequestID
      if (response.status === 409) {
        console.log('⚠️ Duplicate request detected (409)');
        
        if (checkoutRequestID || sessionId) {
          console.log('✅ Continuing with existing request:', checkoutRequestID || sessionId);
          
          setPaymentStatus({
            status: 'waiting',
            message: '⏳ Previous payment request detected. Checking status...',
            checkoutRequestID,
            sessionId
          });
          pollPaymentStatus(sessionId || checkoutRequestID);
          return;
        }
      }

      // ONLY FAIL IF WE TRULY DON'T HAVE A CHECKOUT REQUEST ID
      console.error('❌ No CheckoutRequestID found in response');
      
      const errorMessage = 
        responseData?.message ||
        responseData?.error ||
        responseData?.data?.message ||
        "Failed to initiate M-Pesa payment. Please try again.";

      throw new Error(errorMessage);

    } catch (err: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ FRONTEND: M-Pesa initiation error');
      console.error('Error object:', err);
      
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      }
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      let errorMessage = "Failed to initiate M-Pesa payment. Please try again.";

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setPaymentStatus({
        status: 'failed',
        message: `❌ ${errorMessage}`
      });

      alert(errorMessage);
    }
  };

  /**
   * Poll payment status (using working code pattern)
   */
  const pollPaymentStatus = (identifier: string) => {
    // Clean up any existing interval first
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    let currentPollCount = 0;
    const maxPolls = 60; // 120 polls × 5s = 10 minutes
    const pollIntervalMs = 5000; // 5 seconds
    let isProcessing = false;

    const maxMinutes = (maxPolls * pollIntervalMs) / 60000;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 STARTING PAYMENT STATUS POLLING');
    console.log('Identifier:', identifier);
    console.log('Max wait time:', maxMinutes, 'minutes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    pollingIntervalRef.current = setInterval(async () => {
      currentPollCount++;
      setPollCount(currentPollCount);

      if (isProcessing) {
        console.log('⏹️ Already processing final state, skipping poll #' + currentPollCount);
        return;
      }

      console.log(`🔍 Poll #${currentPollCount}/${maxPolls} - Checking payment status...`);

      try {
        const statusResult = await queryPaymentStatus(identifier);

        if (!statusResult.success || !statusResult.data) {
          console.warn(`⚠️ Status query failed on poll #${currentPollCount}/${maxPolls}`);
          
          if (currentPollCount >= maxPolls - 5) {
            throw new Error(statusResult.message || "Unable to verify payment status");
          }
          return;
        }

        const { paymentStatus: localStatus, mikrotikStatus, mpesaStatus, rateLimited, retryAfter } = statusResult.data;

        if (rateLimited) {
          console.log(`⏳ Rate limited - backend says wait ${retryAfter}s`);
          setPaymentStatus(prev => ({
            ...prev,
            message: `⏳ Checking payment... (next check in ${retryAfter}s)`
          }));
          return;
        }

        const code = mpesaStatus?.ResultCode != null 
          ? String(mpesaStatus.ResultCode).trim() 
          : null;

        const desc = mpesaStatus?.ResultDesc || "Waiting for payment...";

        console.log(`Poll #${currentPollCount} result:`, {
          resultCode: code,
          resultDesc: desc,
          localStatus,
          mikrotikStatus,
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
            status: 'success',
            message: `✅ Payment successful! Receipt: ${mpesaStatus?.MpesaReceiptNumber || 'Processing...'}`,
          });

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
        } else if (currentPollCount <= 72) {
          userMessage = `⏳ Still waiting for payment confirmation... (${timeDisplay})`;
        } else {
          userMessage = `⏳ Taking longer than usual, but we're still waiting... (${timeDisplay})`;
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
            message: `⏱️ Payment check timed out after ${maxMinutes} minutes. Please check your M-Pesa messages.`,
          });
        }
      } catch (error) {
        console.error('❌ Status polling error on poll #' + currentPollCount + ':', error);

        if (currentPollCount < maxPolls - 10) {
          console.log('⚠️ Transient error, will retry...');
          setPaymentStatus(prev => ({
            ...prev,
            message: `⚠️ Connection issue, retrying... (${currentPollCount}/${maxPolls})`
          }));
          return;
        }

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

      let statusData;
      
      if (responseData?.data) {
        statusData = responseData.data;
      } else if (responseData?.paymentStatus || responseData?.mpesaStatus) {
        statusData = responseData;
      } else {
        statusData = responseData;
      }

      console.log('Status data:', {
        hasPaymentStatus: !!statusData.paymentStatus,
        hasMpesaStatus: !!statusData.mpesaStatus,
        paymentStatus: statusData.paymentStatus,
        mikrotikStatus: statusData.mikrotikStatus,
        resultCode: statusData.mpesaStatus?.ResultCode
      });

      return {
        success: true,
        data: statusData
      };
      
    } catch (error: any) {
      console.error('❌ STATUS QUERY ERROR:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to query payment status'
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
    setSelectedPackage(null);
    setPhoneNumber('');
    setVoucherCode('');
    setPaymentStatus({ status: 'idle', message: '' });
    setErrors({});
    setPollCount(0);
    setTimeElapsed(0);
    setIsVoucherMode(false);
  };

  /**
   * Get icon component
   */
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'zap': return <Zap className="w-6 h-6" />;
      case 'clock': return <Clock className="w-6 h-6" />;
      case 'star': return <Star className="w-6 h-6" />;
      default: return <Wifi className="w-6 h-6" />;
    }
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    if (hours >= 24) {
      return `${hours / 24} Day${hours / 24 > 1 ? 's' : ''}`;
    }
    return `${hours} Hour${hours > 1 ? 's' : ''}`;
  };

  /**
   * Format elapsed time
   */
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading packages...</p>
        </div>
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
                <h1 className="text-xl font-bold text-gray-900">WiFi Access Portal</h1>
                <p className="text-xs text-gray-600">Get instant internet access</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">Network Available</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Success State */}
        {paymentStatus.status === 'success' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 animate-in fade-in duration-500">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Connected! 🎉</h2>
              <p className="text-base text-gray-600 mb-4">{paymentStatus.message}</p>
              {selectedPackage && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 mb-4">
                  <p className="text-gray-700 mb-2">
                    Your <strong>{selectedPackage?.name}</strong> package is now active
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Session expires after {formatDuration(selectedPackage?.duration || 0)}</span>
                  </div>
                </div>
              )}
              <button
                onClick={resetFlow}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm"
              >
                Purchase Another Package
              </button>
            </div>
          </div>
        )}

        {/* Payment Waiting State */}
        {paymentStatus.status === 'waiting' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 animate-in fade-in duration-500">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Phone</h2>
              <p className="text-base text-gray-600 mb-4">
                We've sent an M-Pesa prompt to <strong>{phoneNumber}</strong>
              </p>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-4">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Phone className="w-5 h-5 text-blue-600 animate-pulse" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-0.5">
                      {formatElapsedTime(timeElapsed)}
                    </div>
                    <div className="text-xs text-gray-600">
                      Poll #{pollCount} • Waiting for payment
                    </div>
                  </div>
                  <Timer className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-gray-700">
                  Enter your M-Pesa PIN to complete payment
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  {paymentStatus.message}
                </p>
              </div>

              <button
                onClick={resetFlow}
                className="text-gray-600 hover:text-gray-700 font-medium text-sm"
              >
                Cancel and try again
              </button>
            </div>
          </div>
        )}

        {/* Failed/Cancelled/Timeout/Error States */}
        {(['failed', 'cancelled', 'timeout', 'error'].includes(paymentStatus.status)) && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 animate-in fade-in duration-500">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {paymentStatus.status === 'cancelled' ? 'Payment Cancelled' : 
                 paymentStatus.status === 'timeout' ? 'Payment Timeout' :
                 paymentStatus.status === 'error' ? 'Verification Error' :
                 'Payment Failed'}
              </h2>
              <p className="text-base text-gray-600 mb-4">{paymentStatus.message}</p>
              <button
                onClick={resetFlow}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Main Flow - Package Selection & Payment */}
        {!['success', 'waiting'].includes(paymentStatus.status) && (
          <>
            {/* Voucher Option Toggle */}
            {!selectedPackage && !isVoucherMode && (
              <div className="text-center mb-6">
                <button
                  onClick={() => setIsVoucherMode(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border-2 border-gray-300 hover:border-blue-500 transition-all text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  <Ticket className="w-4 h-4" />
                  Have a voucher code? Click here
                </button>
              </div>
            )}

            {/* Voucher Mode */}
            {isVoucherMode && (
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto mb-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Redeem Voucher</h2>
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
                    Voucher Code
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Enter voucher code"
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
                      Redeem Voucher
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
                      <div
                        key={pkg.packageId}
                        onClick={() => handlePackageSelect(pkg)}
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
                            {pkg.name}
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
                          MAC: {macAddress}
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
                          <h3 className="font-bold text-gray-900 text-sm">{selectedPackage.name} Package</h3>
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
              <span className="font-medium">Device MAC:</span> {macAddress}
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