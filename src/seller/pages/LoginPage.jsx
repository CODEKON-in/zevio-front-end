import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSellerAuth } from '../context/SellerAuthContext';
import Logo from '../components/common/Logo';

export default function LoginPage() {
  const {
    user,
    loading,
    error,
    setError,
    handleLogin,
    loginAsDevGuest,
    isDevAllowed,
  } = useSellerAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devShopId, setDevShopId] = useState(
    import.meta.env.VITE_DEV_SHOP_ID || 'shop_ayyampettai_01'
  );

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/seller/dashboard';

  // If already authenticated, redirect to dashboard
  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const onGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await handleLogin();
      navigate(from, { replace: true });
    } catch (err) {
      // Error is set in auth context
      console.error('Sign-in failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDevGuestSignIn = () => {
    try {
      loginAsDevGuest(devShopId);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        backgroundColor: 'var(--cream)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--line)',
        }}
      >
        {/* Brand Logo */}
        <div style={{ marginBottom: '20px' }}>
          <Logo size="large" showBadge={true} />
        </div>

        {/* Title & Subtitle */}
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            marginBottom: '6px',
            color: 'var(--ink-900)',
          }}
        >
          Partner Portal
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--ink-600)',
            marginBottom: '28px',
            lineHeight: 1.4,
          }}
        >
          Manage orders, menu items, and store settings for Papanasam & Ayyampettai deliveries.
        </p>

        {/* Error Notification Alert */}
        {error && (
          <div
            role="alert"
            style={{
              width: '100%',
              padding: '14px 16px',
              backgroundColor: 'var(--error-bg)',
              border: '1px solid rgba(200, 69, 59, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '22px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--error)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: '1px' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span
              style={{
                fontSize: '13.5px',
                color: 'var(--ink-900)',
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {error}
            </span>
          </div>
        )}

        {/* Continue with Google button */}
        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={isSubmitting || loading}
          style={{
            width: '100%',
            minHeight: '48px',
            padding: '0 20px',
            backgroundColor: '#FFFFFF',
            color: 'var(--ink-900)',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-heading)',
            fontSize: '15px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: 'var(--shadow-xs)',
            cursor: isSubmitting || loading ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition-fast)',
            opacity: isSubmitting ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.backgroundColor = 'var(--mango-50)';
              e.currentTarget.style.borderColor = 'var(--mango-500)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = 'var(--line)';
            }
          }}
        >
          {isSubmitting ? (
            <>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid var(--line)',
                  borderTopColor: 'var(--mango-600)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              {/* Google "G" Icon */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* DEV-ONLY GUEST BYPASS (Only shown in Vite Dev mode or when VITE_ALLOW_GUEST is true) */}
        {isDevAllowed && (
          <div
            style={{
              marginTop: '22px',
              padding: '16px',
              backgroundColor: 'var(--mango-50)',
              border: '1.5px dashed var(--mango-600)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--mango-text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                🛠️ Dev-Only Bypass
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--ink-600)', fontWeight: 600 }}>
                Local Test Mode
              </span>
            </div>

            <label
              htmlFor="dev-shop-id-input"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ink-900)',
                marginBottom: '4px',
              }}
            >
              Target Firestore Shop ID:
            </label>
            <input
              id="dev-shop-id-input"
              type="text"
              value={devShopId}
              onChange={(e) => setDevShopId(e.target.value)}
              placeholder="e.g. shop_ayyampettai_01"
              style={{
                width: '100%',
                minHeight: '38px',
                padding: '0 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#FFFFFF',
                marginBottom: '10px',
              }}
            />

            <button
              type="button"
              onClick={onDevGuestSignIn}
              className="btn-primary"
              style={{
                width: '100%',
                minHeight: '44px',
                fontSize: '13.5px',
              }}
            >
              Continue as test seller (dev only)
            </button>
          </div>
        )}

        {/* Notice: No sign-up */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid var(--line-light)',
            width: '100%',
          }}
        >
          <p style={{ fontSize: '12.5px', color: 'var(--ink-400)', lineHeight: 1.45 }}>
            Access is invite-only. If you are a new shop partner, contact the Mynt operations team to register your store.
          </p>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
