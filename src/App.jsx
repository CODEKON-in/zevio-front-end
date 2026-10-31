import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import OfflineBanner from './components/layout/OfflineBanner.jsx';
import PageLoader from './components/layout/PageLoader.jsx';
import ErrorBoundary from './components/layout/ErrorBoundary.jsx';
import { ADMIN_BASE, IS_DEV } from './utils/constants.js';

/** React.lazy that retries once after 1.5 s — village networks often drop a single request. */
function lazyRetry(load) {
  return lazy(() => load().catch(() => new Promise((resolve) => setTimeout(resolve, 1500)).then(load)));
}

// Each role is its own chunk, so customers never download the admin panel.
const CustomerApp = lazyRetry(() => import('./pages/customer/CustomerApp.jsx'));
const ShopPanelApp = lazyRetry(() => import('./pages/shop/ShopPanelApp.jsx'));
const DeliveryApp = lazyRetry(() => import('./pages/delivery/DeliveryApp.jsx'));
const AdminApp = lazyRetry(() => import('./pages/admin/AdminApp.jsx'));

// DEV-only chunks — removed from production builds.
const UiKit = IS_DEV ? lazy(() => import('./pages/dev/UiKit.jsx')) : null;

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <OfflineBanner />
      {/* A crash shows a friendly Reload screen; moving to another page clears it. */}
      <ErrorBoundary resetKey={pathname}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Shop panel handles its own login screen. */}
            <Route path="/shop-panel/*" element={<ShopPanelApp />} />
            {/* Delivery app handles its own login screen. */}
            <Route path="/delivery/*" element={<DeliveryApp />} />
            {/* Admin panel handles its own login screen. Its path comes from
                VITE_ADMIN_PATH; anything else falls through to the customer app. */}
            <Route path={`${ADMIN_BASE}/*`} element={<AdminApp />} />
            {IS_DEV && <Route path="/dev/ui" element={<UiKit />} />}
            {/* Customer section handles its own login screen. */}
            <Route path="/*" element={<CustomerApp />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

    </>
  );
}
