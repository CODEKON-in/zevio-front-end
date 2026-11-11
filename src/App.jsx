import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import OfflineBanner from './components/layout/OfflineBanner.jsx';
import PageLoader from './components/layout/PageLoader.jsx';
import ErrorBoundary from './components/layout/ErrorBoundary.jsx';

/** React.lazy that retries once after 1.5 s — village networks often drop a single request. */
function lazyRetry(load) {
  return lazy(() => load().catch(() => new Promise((resolve) => setTimeout(resolve, 1500)).then(load)));
}

// The customer app is the whole site (there is no admin or delivery panel).
const CustomerApp = lazyRetry(() => import('./pages/customer/CustomerApp.jsx'));
// Outside the customer app on purpose: it must work before anyone signs in, on
// whatever device is being checked.
const LocationCheck = lazyRetry(() => import('./pages/LocationCheck.jsx'));

// The shop owners' panel, served at /seller. Lazy, so customers never download it.
const SellerApp = lazyRetry(() => import('./seller/SellerApp.jsx'));

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <OfflineBanner />
      {/* A crash shows a friendly Reload screen; moving to another page clears it. */}
      <ErrorBoundary resetKey={pathname}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/location-check" element={<LocationCheck />} />
            <Route path="/seller/*" element={<SellerApp />} />
            {/* Customer section handles its own login screen. */}
            <Route path="/*" element={<CustomerApp />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
