import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import OfflineBanner from './components/layout/OfflineBanner.jsx';
import PageLoader from './components/layout/PageLoader.jsx';
import ErrorBoundary from './components/layout/ErrorBoundary.jsx';
import { ADMIN_BASE } from './utils/constants.js';

/** React.lazy that retries once after 1.5 s — village networks often drop a single request. */
function lazyRetry(load) {
  return lazy(() => load().catch(() => new Promise((resolve) => setTimeout(resolve, 1500)).then(load)));
}

// Each section is its own chunk, so customers never download the admin panel.
const CustomerApp = lazyRetry(() => import('./pages/customer/CustomerApp.jsx'));
const AdminApp = lazyRetry(() => import('./pages/admin/AdminApp.jsx'));
// Outside both sections on purpose: it must work before anyone signs in, on
// whatever device is being checked.
const LocationCheck = lazyRetry(() => import('./pages/LocationCheck.jsx'));

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <OfflineBanner />
      {/* A crash shows a friendly Reload screen; moving to another page clears it. */}
      <ErrorBoundary resetKey={pathname}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Admin panel handles its own login screen. Its path comes from
                VITE_ADMIN_PATH; anything else falls through to the customer app. */}
            <Route path={`${ADMIN_BASE}/*`} element={<AdminApp />} />
            <Route path="/location-check" element={<LocationCheck />} />
            {/* Customer section handles its own login screen. */}
            <Route path="/*" element={<CustomerApp />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
