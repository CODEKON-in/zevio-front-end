import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ShopPanelProvider } from '../../context/ShopPanelContext.jsx';
import ShopTabBar from '../../components/shop/ShopTabBar.jsx';
import { unlockAudio } from '../../utils/alerts.js';
import { ROLES } from '../../utils/constants.js';
import SignIn from '../auth/SignIn.jsx';
import Dashboard from './Dashboard.jsx';
import ShopOrderDetail from './ShopOrderDetail.jsx';
import Products from './Products.jsx';
import ProductForm from './ProductForm.jsx';
import ShopSettings from './ShopSettings.jsx';

function TabsLayout() {
  return (
    <>
      <Outlet />
      <ShopTabBar />
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
 * Shop owner panel (lazy-loaded, mobile-first).
 * Routes: /shop-panel  /shop-panel/orders/:id  /shop-panel/products  /shop-panel/products/new
 *         /shop-panel/products/:id  /shop-panel/settings
 */
export default function ShopPanelApp() {
  const { user } = useAuth();

  // Browsers block sound until the user taps once; unlock on the first tap.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  if (user?.role !== ROLES.SHOP) return <SignIn role={ROLES.SHOP} />;

  return (
    <ShopPanelProvider key={user.shopId}>
      <ScrollToTop />
      <Routes>
        <Route element={<TabsLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="settings" element={<ShopSettings />} />
        </Route>
        <Route path="orders/:id" element={<ShopOrderDetail />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="*" element={<Navigate to="/shop-panel" replace />} />
      </Routes>
    </ShopPanelProvider>
  );
}
