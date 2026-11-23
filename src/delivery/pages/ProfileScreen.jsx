import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDelivery } from '../context/DeliveryContext';
import { formatDateShort } from '../utils/dateUtils';

export default function ProfileScreen() {
  const {
    partner,
    earningsSummary,
    isOnDuty,
    toggleDutyStatus,
    logout,
    isSigningOut,
    resetDemoData
  } = useDelivery();
  const navigate = useNavigate();
  const [resetMessage, setResetMessage] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/delivery/login', { replace: true });
  };

  const handleResetDemo = () => {
    resetDemoData();
    setResetMessage('Sample orders restored to initial state.');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setResetMessage(''), 3500);
  };

  if (!partner) return null;

  const initials = (partner.name || 'MD')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const shortPartnerId = partner.uid ? `DP-${partner.uid.slice(0, 6).toUpperCase()}` : 'DP-PARTNER';

  return (
    <div className="screen-container">
      <header className="page-header">
        <h1 className="page-header__title">Partner Profile</h1>
        <p className="page-header__subtitle">MYNT Delivery Partner Account</p>
      </header>

      {/* Partner Identity Card (with Google Profile Photo) */}
      <section className="profile-hero-card">
        {partner.photoURL && !photoError ? (
          <img
            src={partner.photoURL}
            alt={partner.name}
            className="profile-avatar-img"
            referrerPolicy="no-referrer"
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div className="profile-avatar" aria-hidden="true">
            {initials}
          </div>
        )}

        <div className="profile-hero-info">
          <span className="profile-id-tag">ID: {shortPartnerId}</span>
          <h2 className="profile-name">{partner.name}</h2>
          <span className={`profile-status-pill ${isOnDuty ? '' : 'profile-status-pill--off'}`}>
            ● {isOnDuty ? 'On Duty • Active Partner' : 'Off Duty'}
          </span>
        </div>
      </section>

      {/* Duty Availability Toggle Card */}
      <section className="detail-card duty-card">
        <div>
          <h3 className="card-section-title">Delivery Availability</h3>
          <p className="support-text" style={{ marginBottom: 0 }}>
            {isOnDuty
              ? 'You are online and ready to receive assigned orders.'
              : 'You are currently off duty. Switch on when ready.'}
          </p>
        </div>
        <button
          type="button"
          className={`duty-toggle duty-toggle--lg ${isOnDuty ? 'duty-toggle--on' : 'duty-toggle--off'}`}
          onClick={toggleDutyStatus}
          aria-pressed={isOnDuty}
        >
          <span className="duty-toggle__dot" aria-hidden="true" />
          <span>{isOnDuty ? 'On Duty' : 'Off Duty'}</span>
        </button>
      </section>

      {/* Account Details */}
      <section className="detail-card profile-details-card">
        <div className="profile-field">
          <span className="profile-field__label">Google Email</span>
          <strong className="profile-field__value">{partner.email || 'Connected via Google'}</strong>
        </div>

        <div className="profile-field">
          <span className="profile-field__label">Assigned Delivery Zone</span>
          <strong className="profile-field__value">
            {partner.zone || 'Papanasam – Ayyampettai Corridor'}
          </strong>
        </div>

        <div className="profile-field">
          <span className="profile-field__label">Total Completed Deliveries</span>
          <strong className="profile-field__value">{earningsSummary.totalCount} Orders</strong>
        </div>

        <div className="profile-field">
          <span className="profile-field__label">Account Created</span>
          <strong className="profile-field__value">
            {partner.createdAt ? formatDateShort(partner.createdAt) : 'Active'}
          </strong>
        </div>

        <div className="profile-field">
          <span className="profile-field__label">Sign-In Method</span>
          <strong className="profile-field__value">Google Account (Verified)</strong>
        </div>
      </section>

      {/* Dispatch Hub Help Box */}
      <section className="detail-card">
        <h3 className="card-section-title">MYNT Dispatch Support</h3>
        <p className="support-text">
          Need help with an order or route change between Papanasam and Ayyampettai?
        </p>
        <a href="tel:9443009900" className="btn btn--outline btn--full">
          📞 Call Papanasam Hub Coordinator
        </a>
      </section>

      {resetMessage && (
        <div className="alert-box alert-box--success" role="status" aria-live="polite">
          {resetMessage}
        </div>
      )}

      {/* Demo Orders Reset & Secure Google Logout */}
      <div className="profile-actions">
        <button type="button" className="btn btn--outline btn--full" onClick={handleResetDemo}>
          Reset Sample Orders
        </button>

        <button
          type="button"
          className="btn btn--danger btn--large btn--full"
          onClick={handleLogout}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <>
              <span className="spinner spinner--sm" aria-hidden="true" />
              Signing out...
            </>
          ) : (
            'Sign Out of MYNT Delivery'
          )}
        </button>
      </div>
    </div>
  );
}
