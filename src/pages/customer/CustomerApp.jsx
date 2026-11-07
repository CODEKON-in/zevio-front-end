import { Suspense, lazy, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { CustomerProvider } from '../../context/CustomerContext.jsx';
import { useLocationStatus } from '../../context/LocationContext.jsx';
import { ErrorState } from '../../components/ui/index.js';
import PageLoader from '../../components/layout/PageLoader.jsx';
import { ROLES } from '../../utils/constants.js';
import CustomerLayout from './CustomerLayout.jsx';
import Splash from './Splash.jsx';
import SignIn from '../auth/SignIn.jsx';
import LocationStep from '../../components/location/LocationStep.jsx';

/*
 * Home, the shop page and the cart stay in the main customer file: they are the
 * path almost every visit takes, and a separate request for them would cost a
 * round trip on a slow connection rather than save one.
 * The screens below are reached later, or rarely, so they load on demand.
 */
import Home from './Home.jsx';
import ShopPage from './ShopPage.jsx';
import Cart from './Cart.jsx';

const Search = lazy(() => import('./Search.jsx'));
const Checkout = lazy(() => import('./Checkout.jsx'));
const OrderSuccess = lazy(() => import('./OrderSuccess.jsx'));
const OrderTracking = lazy(() => import('./OrderTracking.jsx'));
const Orders = lazy(() => import('./Orders.jsx'));
const Profile = lazy(() => import('./Profile.jsx'));
const NotServiceable = lazy(() => import('./NotServiceable.jsx'));
const WelcomeAddress = lazy(() => import('./WelcomeAddress.jsx'));

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
 * Routes: /  /search  /shop/:id  /cart  /checkout  /orders  /orders/:id  /orders/:id/placed  /profile  /not-serviceable  /location  /welcome/address
 */
/**
 * The same GPS-first step, opened on purpose: Profile → Update, or "Not your
 * area? Re-detect location" in the address form. It goes back where it came
 * from, and tells the address form to open again with the new area.
 */
function UpdateLocation() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const back = () =>
    navigate(state?.returnTo || '/profile', { replace: true, state: state?.reopenAddress ? { reopenAddress: true } : null });
  return <LocationStep onDone={back} onCancel={back} />;
}

export default function CustomerApp() {
  const { user } = useAuth();
  const { status, error, reload } = useSettings();
  const location = useLocationStatus();
  const booted = useRef(false);
  const navigate = useNavigate();

  if (status === 'ready') booted.current = true;
  if (!booted.current && status === 'loading') return <Splash />;
  if (!booted.current && status === 'error') return <ErrorState error={error} onRetry={reload} />;

  if (user?.role !== ROLES.CUSTOMER) return <SignIn />;

  // Signed in: the location step comes before anything else, and cannot be
  // skipped — whether they are in range decides how they can pay. Every
  // route, Home included, is behind it.
  // In range: offer the address page next (it can be skipped). Out of range:
  // straight Home — their own address is not where orders can go.
  if (location.needsStep) {
    return <LocationStep onDone={(r) => navigate(r.status === 'in_range' ? '/welcome/address' : '/', { replace: true })} />;
  }

  return (
    <CustomerProvider>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
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
          <Route path="location" element={<UpdateLocation />} />
          <Route path="welcome/address" element={<WelcomeAddress />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </CustomerProvider>
  );
}
