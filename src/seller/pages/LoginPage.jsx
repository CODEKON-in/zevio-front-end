import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSellerAuth } from '../context/SellerAuthContext';
import Logo from '../components/common/Logo';
import GoogleButton from '../../pages/auth/GoogleButton.jsx';

export default function LoginPage() {
  const {
    user,
    loading,
    error,
    setError,
    handleLoginWithCredential,
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

  const onGoogleCredential = async (account) => {
    try {
      setIsSubmitting(true);
      await handleLoginWithCredential(account.credential);
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

        {/* Official Google Sign-In button (works reliably across browsers & webviews) */}
        <div style={{ width: '100%' }}>
          <GoogleButton onSuccess={onGoogleCredential} busy={isSubmitting || loading} />
        </div>

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
