import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DeliveryProvider, useDelivery } from './context/DeliveryContext';
import AppShell from './components/AppShell';
import AuthLoadingScreen from './components/AuthLoadingScreen';
import LoginScreen from './pages/LoginScreen';
import ActiveOrdersScreen from './pages/ActiveOrdersScreen';
import OrderDetailScreen from './pages/OrderDetailScreen';
import OrderHistoryScreen from './pages/OrderHistoryScreen';
import EarningsScreen from './pages/EarningsScreen';
import ProfileScreen from './pages/ProfileScreen';
import './styles/app.css';

function ProtectedRoute({ children }) {
  const { authStatus, isAuthenticated } = useDelivery();
  const location = useLocation();

  // Never render or flash protected content before auth verification completes
  if (authStatus === 'checking') {
    return <AuthLoadingScreen message="Verifying your MYNT Delivery session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/delivery/login" state={{ from: location }} replace />;
  }

  return children;
}

function PublicLoginRoute() {
  const { authStatus, isAuthenticated } = useDelivery();
  const location = useLocation();
  const redirectTarget = location.state?.from?.pathname || '/delivery/orders';

  if (authStatus === 'checking') {
    return <AuthLoadingScreen message="Checking your session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTarget} replace />;
  }

  return <LoginScreen />;
}

export default function DeliveryApp() {
  return (
    <DeliveryProvider>
      <Routes>
        <Route path="login" element={<PublicLoginRoute />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<ActiveOrdersScreen />} />
          <Route path="orders/:orderId" element={<OrderDetailScreen />} />
          <Route path="history" element={<OrderHistoryScreen />} />
          <Route path="earnings" element={<EarningsScreen />} />
          <Route path="profile" element={<ProfileScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="orders" replace />} />
      </Routes>
    </DeliveryProvider>
  );
}
