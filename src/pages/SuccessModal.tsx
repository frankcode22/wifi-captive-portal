import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Package, Truck, X } from 'lucide-react';

// ============================================
// SUCCESS MODAL COMPONENT
// ============================================

interface SuccessModalProps {
  isOpen: boolean;
  orderId: string;
  totalAmount: number;
  estimatedDelivery?: string;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  orderId,
  totalAmount,
  estimatedDelivery,
  onClose
}) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (isOpen) {
      // Reset countdown when modal opens
      setCountdown(4);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Navigate after 4 seconds
      const navigationTimer = setTimeout(() => {
        navigate('/customer/dashboard');
      }, 2000);

      // Cleanup
      return () => {
        clearInterval(countdownInterval);
        clearTimeout(navigationTimer);
      };
    }
  }, [isOpen, navigate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-lg transition-all hover:scale-110"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Success Header with animated gradient */}
        <div className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-8 text-center overflow-hidden">
          {/* Animated background circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 animate-pulse delay-700" />
          
          {/* Success Icon with animation */}
          <div className="relative mb-4">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl animate-bounceIn">
              <CheckCircle className="w-16 h-16 text-green-500" strokeWidth={2.5} />
            </div>
            {/* Animated check ring */}
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-4 border-white/30 animate-ping" />
          </div>

          <h1 className="text-3xl font-black text-white mb-2 drop-shadow-lg">
            Hongera! 🎉
          </h1>
          <p className="text-white/95 text-lg font-semibold">
            Order Placed Successfully!
          </p>
        </div>

        {/* Order Details */}
        <div className="p-6 space-y-4">
          {/* Order ID Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Order Number</p>
                <p className="text-lg font-black text-gray-900">{orderId}</p>
              </div>
              <Package className="w-10 h-10 text-green-600" />
            </div>
          </div>

          {/* Amount & Delivery Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Total Amount</p>
              <p className="text-xl font-black text-green-600">
                KSh {totalAmount.toLocaleString()}
              </p>
            </div>
            {estimatedDelivery && (
              <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
                <p className="text-xs text-gray-600 mb-1 flex items-center justify-center gap-1">
                  <Truck className="w-3 h-3" />
                  Delivery By
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {estimatedDelivery}
                </p>
              </div>
            )}
          </div>

          {/* Redirect Notice */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-blue-800 text-center font-medium">
              Redirecting to dashboard in{' '}
              <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-black mx-1 animate-pulse">
                {countdown}
              </span>
              {countdown === 1 ? 'second' : 'seconds'}...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('/customer/dashboard')}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
            >
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Decorative bottom wave */}
        <div className="h-2 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
      </div>
    </div>
  );
};

export default SuccessModal;




