import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  DashboardIcon,
  OrdersIcon,
  ProductsIcon,
  HistoryIcon,
  SettingsIcon,
} from '../common/Icons';

export default function BottomNav({ newOrdersCount = 0 }) {
  const navItems = [
    { to: '/seller/dashboard', label: 'Home', icon: DashboardIcon },
    { to: '/seller/orders', label: 'Orders', icon: OrdersIcon, badge: newOrdersCount },
    { to: '/seller/products', label: 'Products', icon: ProductsIcon },
    { to: '/seller/history', label: 'History', icon: HistoryIcon },
    { to: '/seller/settings', label: 'Shop', icon: SettingsIcon },
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="bottom-nav-icon-wrap">
              <IconComponent size={22} />
              {Boolean(item.badge && item.badge > 0) && (
                <span className="bottom-nav-badge">{item.badge}</span>
              )}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

