import React from 'react';
import MyntLogo from './MyntLogo';

export default function AuthLoadingScreen({ message = 'Checking your session...' }) {
  return (
    <div className="auth-loading-page" role="status" aria-live="polite">
      <div className="auth-loading-card">
        <MyntLogo size={54} subtitle="DELIVERY" />
        <div className="auth-spinner-wrap">
          <span className="spinner spinner--lg" aria-hidden="true" />
        </div>
        <p className="auth-loading-message">{message}</p>
      </div>
    </div>
  );
}

