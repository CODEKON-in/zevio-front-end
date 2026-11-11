import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SellerAuthProvider } from './context/SellerAuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import './styles/global.css';

/**
 * The Mynt seller panel, served at /seller/*.
 * A copy of the standalone mynt-seller-admin-panel app, mounted inside this
 * app's router (so its routes are relative to /seller) and loaded lazily so
 * customers never download it.
 */
export default function SellerApp() {
  return (
    <SellerAuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/seller/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/seller/dashboard" replace />} />
      </Routes>
    </SellerAuthProvider>
  );
}
