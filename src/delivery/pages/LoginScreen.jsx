import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MyntLogo from '../components/MyntLogo';
import { useDelivery } from '../context/DeliveryContext';

function GoogleBrandIcon() {
  return (
    <svg
      className="google-btn__icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export default function LoginScreen() {
  const {
    authStatus,
    authError,
    isFirebaseConfigured,
    signInWithGoogle,
    clearAuthError
  } = useDelivery();

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = location.state?.from?.pathname || '/delivery/orders';

  const isSigningIn = authStatus === 'signing_in';

  const handleGoogleLogin = async () => {
    clearAuthError();
    const res = await signInWithGoogle();
    if (res?.success && !res?.redirecting) {
      navigate(redirectTarget, { replace: true });
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <MyntLogo size={58} subtitle="DELIVERY PARTNER" inverted />
        <p className="login-hero__corridor">
          Papanasam ↔ Ayyampettai Hyperlocal Delivery
        </p>
      </div>

      <main className="login-card" aria-labelledby="login-heading">
        <div className="login-card__intro">
          <h1 id="login-heading" className="login-card__title">
            Welcome to MYNT Delivery
          </h1>
          <p className="login-card__subtitle">
            Sign in with your Google account to manage deliveries, track your earnings, and start delivering.
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="alert-box alert-box--warning" role="status">
            Firebase Google Auth credentials are not configured yet. Add your Firebase keys to{' '}
            <code>.env</code> (see <code>.env.example</code>) and restart the dev server.
          </div>
        )}

        {authError && (
          <div className="alert-box alert-box--error" role="alert">
            {authError}
          </div>
        )}

        <button
          type="button"
          className={`google-btn ${isSigningIn ? 'google-btn--loading' : ''}`}
          onClick={handleGoogleLogin}
          disabled={isSigningIn}
          aria-busy={isSigningIn}
        >
          {isSigningIn ? (
            <>
              <span className="spinner spinner--dark" aria-hidden="true" />
              <span>Signing in with Google...</span>
            </>
          ) : (
            <>
              <GoogleBrandIcon />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="login-terms">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </main>
    </div>
  );
}
