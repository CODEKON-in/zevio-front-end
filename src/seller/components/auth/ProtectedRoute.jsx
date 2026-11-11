import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSellerAuth } from '../../context/SellerAuthContext';
import Logo from '../common/Logo';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useSellerAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          backgroundColor: 'var(--cream)',
          padding: '20px',
        }}
      >
        <Logo size="medium" showBadge={true} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '12px',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              border: '2.5px solid var(--line)',
              borderTopColor: 'var(--mango-600)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '14px',
              color: 'var(--ink-600)',
              fontWeight: 600,
            }}
          >
            Verifying seller access...
          </span>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/seller/login" state={{ from: location }} replace />;
  }

  return children;
}

