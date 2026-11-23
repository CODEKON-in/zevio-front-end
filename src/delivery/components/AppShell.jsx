import React, { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import MyntLogo from './MyntLogo';
import { useDelivery } from '../context/DeliveryContext';

export default function AppShell() {
  const { partner, activeOrders, isOnDuty, toggleDutyStatus } = useDelivery();
  const { pathname } = useLocation();

  // Scroll cleanly to top on route navigation so previous page scroll doesn't leak
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  const primaryZone = partner?.zone?.split('–')[0]?.trim() || 'Papanasam';

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__inner">
          <Link to="/delivery/orders" className="top-bar__brand-link" aria-label="MYNT Delivery Home">
            <MyntLogo size={36} subtitle="DELIVERY" />
          </Link>
          <div className="top-bar__partner">
            <button
              type="button"
              className={`duty-toggle ${isOnDuty ? 'duty-toggle--on' : 'duty-toggle--off'}`}
              onClick={toggleDutyStatus}
              aria-pressed={isOnDuty}
              aria-label={isOnDuty ? 'Currently On Duty. Tap to go Off Duty' : 'Currently Off Duty. Tap to go On Duty'}
            >
              <span className="duty-toggle__dot" aria-hidden="true" />
              <span>{isOnDuty ? 'On Duty' : 'Off Duty'}</span>
            </button>
            <span className="top-bar__zone">{primaryZone}</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Primary Navigation">
        <NavLink
          to="/delivery/orders"
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
        >
          <span className="bottom-nav__icon-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M7 8h10M7 12h10M7 16h6" strokeLinecap="round" />
            </svg>
            {activeOrders.length > 0 && (
              <span className="bottom-nav__badge" aria-label={`${activeOrders.length} active orders`}>
                {activeOrders.length}
              </span>
            )}
          </span>
          <span className="bottom-nav__label">Active</span>
        </NavLink>

        <NavLink
          to="/delivery/history"
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
        >
          <span className="bottom-nav__icon-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="bottom-nav__label">History</span>
        </NavLink>

        <NavLink
          to="/delivery/earnings"
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
        >
          <span className="bottom-nav__icon-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M6 4h12M6 8h12M9 4c3 0 5 2 5 4s-2 4-5 4H6l8 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="bottom-nav__label">Earnings</span>
        </NavLink>

        <NavLink
          to="/delivery/profile"
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
        >
          <span className="bottom-nav__icon-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="bottom-nav__label">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
