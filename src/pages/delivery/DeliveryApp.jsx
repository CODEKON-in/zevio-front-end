import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { DeliveryProvider } from '../../context/DeliveryContext.jsx';
import DeliveryTabBar from '../../components/delivery/DeliveryTabBar.jsx';
import { unlockAudio } from '../../utils/alerts.js';
import { ROLES } from '../../utils/constants.js';
import SignIn from '../auth/SignIn.jsx';
import DeliveryHome from './DeliveryHome.jsx';
import DeliveryOrderDetail from './DeliveryOrderDetail.jsx';
import DeliveryHistory from './DeliveryHistory.jsx';
import DeliveryAccount from './DeliveryAccount.jsx';

function TabsLayout() {
  return (
    <>
      <Outlet />
      <DeliveryTabBar />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Delivery partner app (lazy-loaded, mobile-first).
 * Routes: /delivery  /delivery/orders/:id  /delivery/history  /delivery/account
 */
export default function DeliveryApp() {
  const { user } = useAuth();

  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  if (user?.role !== ROLES.DELIVERY) return <SignIn role={ROLES.DELIVERY} />;

  return (
    <DeliveryProvider key={user.partnerId}>
      <ScrollToTop />
      <Routes>
        <Route element={<TabsLayout />}>
          <Route index element={<DeliveryHome />} />
          <Route path="history" element={<DeliveryHistory />} />
          <Route path="account" element={<DeliveryAccount />} />
        </Route>
        <Route path="orders/:id" element={<DeliveryOrderDetail />} />
        <Route path="*" element={<Navigate to="/delivery" replace />} />
      </Routes>
    </DeliveryProvider>
  );
}
