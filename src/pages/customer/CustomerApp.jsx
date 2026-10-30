import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { CustomerProvider } from '../../context/CustomerContext.jsx';
import { ErrorState } from '../../components/ui/index.js';
import { ROLES } from '../../utils/constants.js';
import CustomerLayout from './CustomerLayout.jsx';
import Splash from './Splash.jsx';
import SignIn from '../auth/SignIn.jsx';
import Home from './Home.jsx';
import Search from './Search.jsx';
import ShopPage from './ShopPage.jsx';
import Cart from './Cart.jsx';
import Checkout from './Checkout.jsx';
import OrderSuccess from './OrderSuccess.jsx';
import OrderTracking from './OrderTracking.jsx';
import Orders from './Orders.jsx';
import Profile from './Profile.jsx';
import NotServiceable from './NotServiceable.jsx';

/** Scroll to the top whenever the page (path) changes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Customer section (lazy-loaded). Flow: Splash → Login → app.
 * Routes: /  /search  /shop/:id  /cart  /checkout  /orders  /orders/:id  /orders/:id/placed  /profile  /not-serviceable
 */
export default function CustomerApp() {
  const { user } = useAuth();
  const { status, error, reload } = useSettings();
  const booted = useRef(false);

  if (status === 'ready') booted.current = true;
  if (!booted.current && status === 'loading') return <Splash />;
  if (!booted.current && status === 'error') return <ErrorState error={error} onRetry={reload} />;

  if (user?.role !== ROLES.CUSTOMER) return <SignIn role={ROLES.CUSTOMER} />;

  return (
    <CustomerProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="orders" element={<Orders />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="shop/:id" element={<ShopPage />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders/:id" element={<OrderTracking />} />
        <Route path="orders/:id/placed" element={<OrderSuccess />} />
        <Route path="not-serviceable" element={<NotServiceable />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CustomerProvider>
  );
}
