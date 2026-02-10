// ============================================
// 1. CUSTOM TOAST UTILITY (utils/customToast.tsx)
// ============================================

import toast from 'react-hot-toast';



interface ToastDetails {
  [key: string]: string | number;
}

// 🎨 Modern Success Toast with Glassmorphism
export const showSuccessToast = (
  title: string,
  details?: ToastDetails,
  duration: number = 5000
) => {
  toast.custom(
    (t) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          padding: '20px 24px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.35), 0 2px 8px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          minWidth: '320px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: t.visible ? 'slideInRight 0.4s ease-out' : 'slideOutRight 0.3s ease-in',
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: '32px',
            lineHeight: 1,
            animation: 'bounceIn 0.6s ease-out',
          }}
        >
          🎉
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: details ? '12px' : '0',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>

          {details && (
            <div
              style={{
                fontSize: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                opacity: 0.95,
              }}
            >
              {Object.entries(details).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.9 }}>{key}:</span>
                  <strong style={{ fontWeight: 600 }}>{value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px 8px',
            lineHeight: 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          ✕
        </button>
      </div>
    ),
    { duration }
  );
};

// ❌ Modern Error Toast with Gradient
export const showErrorToast = (
  title: string,
  message: string,
  subtitle?: string,
  duration: number = 6000
) => {
  toast.custom(
    (t) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
          color: '#333',
          padding: '20px 24px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08)',
          maxWidth: '500px',
          minWidth: '320px',
          borderLeft: '4px solid #ef4444',
          animation: t.visible ? 'slideInRight 0.4s ease-out' : 'slideOutRight 0.3s ease-in',
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: '28px',
            lineHeight: 1,
            animation: 'shake 0.5s ease-in-out',
          }}
        >
          ❌
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: '#ef4444',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: '14px',
              color: '#4b5563',
              marginBottom: subtitle ? '8px' : '0',
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>

          {subtitle && (
            <div
              style={{
                fontSize: '12px',
                color: '#9ca3af',
                fontStyle: 'italic',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            background: '#fee2e2',
            border: 'none',
            borderRadius: '8px',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
            lineHeight: 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fecaca';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fee2e2';
          }}
        >
          ✕
        </button>
      </div>
    ),
    { duration }
  );
};

// ⚠️ Modern Warning Toast
export const showWarningToast = (
  title: string,
  message: string,
  duration: number = 5000
) => {
  toast.custom(
    (t) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
          color: '#333',
          padding: '20px 24px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08)',
          maxWidth: '500px',
          minWidth: '320px',
          borderLeft: '4px solid #f59e0b',
          animation: t.visible ? 'slideInRight 0.4s ease-out' : 'slideOutRight 0.3s ease-in',
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: '28px',
            lineHeight: 1,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          ⚠️
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: '#f59e0b',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: '14px',
              color: '#4b5563',
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
            }}
          >
            {message}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            background: '#fef3c7',
            border: 'none',
            borderRadius: '8px',
            color: '#f59e0b',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
            lineHeight: 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fde68a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fef3c7';
          }}
        >
          ✕
        </button>
      </div>
    ),
    { duration }
  );
};

// 🔄 Modern Loading Toast
export const showLoadingToast = (message: string = 'Processing...') => {
  return toast.custom(
    (t) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.35), 0 2px 8px rgba(0, 0, 0, 0.1)',
          minWidth: '300px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: t.visible ? 'slideInRight 0.4s ease-out' : 'slideOutRight 0.3s ease-in',
        }}
      >
        {/* Spinner */}
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid #fff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />

        {/* Message */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          {message}
        </div>
      </div>
    ),
    { duration: Infinity }
  );
};

// 📱 Network Error Toast
export const showNetworkErrorToast = () => {
  showErrorToast(
    'Connection Failed',
    'Cannot connect to server. Please check your internet connection.',
    'Tap to retry or contact support'
  );
};





