import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AdminAuthProvider, homeFor, useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { ROLES } from '../../services/adminAuth/index.js';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import PageLoader from '../../components/layout/PageLoader.jsx';
import { ADMIN_BASE } from '../../utils/constants.js';
import AdminLogin from './AdminLogin.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminShops from './AdminShops.jsx';
import AdminProducts from './AdminProducts.jsx';
import AdminPartners from './AdminPartners.jsx';
import AdminCustomers from './AdminCustomers.jsx';
import AdminSettings from './AdminSettings.jsx';
import AdminAccess from './AdminAccess.jsx';
import AdminMyShop from './AdminMyShop.jsx';

const SUPER = [ROLES.SUPERADMIN];
const BOTH = [ROLES.SUPERADMIN, ROLES.SHOP_OWNER];

/**
 * Guard for one admin route: signed in, allowed, and the role fits — else
 * to the login page, or to that user's own home page.
 */
function AdminRoute({ roles, children }) {
  const { status, admin } = useAdminAuth();
  const { pathname } = useLocation();
  if (status === 'checking') return <PageLoader />;
  if (status !== 'ready') return <Navigate to={`${ADMIN_BASE}/login`} replace state={{ from: pathname }} />;
  if (!roles.includes(admin.role)) return <Navigate to={homeFor(admin.role)} replace />;
  return children;
}

/** A shop owner may open the menu page of their own shop only. */
function OwnShopOnly({ children }) {
  const { admin } = useAdminAuth();
  const { shopId } = useParams();
  if (admin.role === ROLES.SHOP_OWNER && shopId !== admin.shopId) return <Navigate to={homeFor(admin.role)} replace />;
  return children;
}

function LoginRoute() {
  const { status, admin } = useAdminAuth();
  if (status === 'ready') return <Navigate to={homeFor(admin.role)} replace />;
  return <AdminLogin />;
}

/**
 * Admin panel (lazy-loaded). Google sign-in, invite-only (adminUsers in
 * Firestore). Routes under VITE_ADMIN_PATH:
 *   superadmin:  /  /orders  /shops  /shops/:shopId/products  /partners
 *                /customers  /settings  /access
 *   shop_owner:  /my-shop  /orders (their shop)  /shops/<their shop>/products
 *   anyone:      /login
 * The site's /api proxy enforces the same roles on every admin request.
 */
export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<LoginRoute />} />
        <Route element={<AdminRoute roles={BOTH}><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminRoute roles={SUPER}><AdminDashboard /></AdminRoute>} />
          <Route path="my-shop" element={<AdminRoute roles={[ROLES.SHOP_OWNER]}><AdminMyShop /></AdminRoute>} />
          <Route path="orders" element={<AdminRoute roles={BOTH}><AdminOrders /></AdminRoute>} />
          <Route path="shops" element={<AdminRoute roles={SUPER}><AdminShops /></AdminRoute>} />
          <Route path="shops/:shopId/products" element={<AdminRoute roles={BOTH}><OwnShopOnly><AdminProducts /></OwnShopOnly></AdminRoute>} />
          <Route path="partners" element={<AdminRoute roles={SUPER}><AdminPartners /></AdminRoute>} />
          <Route path="customers" element={<AdminRoute roles={SUPER}><AdminCustomers /></AdminRoute>} />
          <Route path="settings" element={<AdminRoute roles={SUPER}><AdminSettings /></AdminRoute>} />
          <Route path="access" element={<AdminRoute roles={SUPER}><AdminAccess /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to={ADMIN_BASE} replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}
