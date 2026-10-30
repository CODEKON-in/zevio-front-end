import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { ADMIN_BASE, ROLES } from '../../utils/constants.js';
import AdminLogin from './AdminLogin.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminShops from './AdminShops.jsx';
import AdminPartners from './AdminPartners.jsx';
import AdminCustomers from './AdminCustomers.jsx';
import AdminSettings from './AdminSettings.jsx';

/**
 * Admin panel (lazy-loaded, desktop-first with a sidebar; works on phones).
 * Routes, under VITE_ADMIN_PATH: /  /orders  /shops  /partners  /customers  /settings
 */
export default function AdminApp() {
  const { user } = useAuth();
  if (user?.role !== ROLES.ADMIN) return <AdminLogin />;

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="shops" element={<AdminShops />} />
        <Route path="partners" element={<AdminPartners />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="*" element={<Navigate to={ADMIN_BASE} replace />} />
    </Routes>
  );
}
