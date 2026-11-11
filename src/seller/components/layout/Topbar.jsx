import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useSellerAuth } from '../../context/SellerAuthContext';
import Logo from '../common/Logo';
import { LogoutIcon, ShopIcon } from '../common/Icons';

export default function Topbar() {
  const { user, seller, handleLogout } = useSellerAuth();
  const navigate = useNavigate();

  // Never the raw document id: "shop_ayyampettai_01" is not a shop's name.
  const shopName = seller?.shopName || 'My Shop';
  const sellerEmail = user?.email || '';
  const isGuest = Boolean(user?.isGuest);

  const onLogoutClick = async () => {
    try {
      await handleLogout();
      navigate('/seller/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {/* Brand Logo */}
        <Link to="/seller/dashboard" className="topbar-brand" aria-label="Mynt Seller Home">
          <Logo size="small" showBadge={true} />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <NavLink
            to="/seller/dashboard"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/seller/orders"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            Orders
          </NavLink>
          <NavLink
            to="/seller/history"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            History
          </NavLink>
          <NavLink
            to="/seller/products"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            Products
          </NavLink>
          <NavLink
            to="/seller/settings"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            Shop Settings
          </NavLink>
        </nav>

        {/* Right side actions */}
        <div className="topbar-actions">
          {/* DEV MODE pill indicator when running in guest mode */}
          {isGuest && (
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                backgroundColor: 'var(--warning)',
                color: '#FFFFFF',
                padding: '3px 8px',
                borderRadius: 'var(--radius-pill)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: 'var(--shadow-xs)',
              }}
              title="Dev-only guest test mode active"
            >
              DEV MODE
            </span>
          )}

          {/* Shop badge */}
          <div className="shop-badge-chip" title={`Shop ID: ${user?.shopId || ''}`}>
            <ShopIcon size={16} />
            <span className="shop-badge-name">{shopName}</span>
          </div>

          {/* User profile / Logout */}
          <button
            type="button"
            onClick={onLogoutClick}
            className="btn-logout"
            title={`Sign out (${sellerEmail})`}
            aria-label="Sign out"
          >
            <LogoutIcon size={16} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
