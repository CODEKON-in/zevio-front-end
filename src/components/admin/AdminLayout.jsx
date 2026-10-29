import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Drawer from '../ui/Drawer.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { BikeIcon, GridIcon, LogoutIcon, MenuIcon, OrdersIcon, StoreIcon, UserIcon, SlidersIcon } from '../icons/Icons.jsx';
import s from './AdminLayout.module.css';

const LINKS = [
  { to: '/admin', key: 'dashboard', Icon: GridIcon, end: true },
  { to: '/admin/orders', key: 'orders', Icon: OrdersIcon },
  { to: '/admin/shops', key: 'shops', Icon: StoreIcon },
  { to: '/admin/partners', key: 'partners', Icon: BikeIcon },
  { to: '/admin/customers', key: 'customers', Icon: UserIcon },
  { to: '/admin/settings', key: 'settings', Icon: SlidersIcon },
];

function NavLinks({ onLogout }) {
  return (
    <nav aria-label={t('admin.navLabel')} className={s.nav}>
      <ul>
        {LINKS.map(({ to, key, Icon, end }) => (
          <li key={key}>
            <NavLink to={to} end={end} className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
              <Icon size={20} />
              {t(`admin.nav.${key}`)}
            </NavLink>
          </li>
        ))}
      </ul>
      <button type="button" className={s.link} onClick={onLogout}>
        <LogoutIcon size={20} />
        {t('admin.nav.logout')}
      </button>
    </nav>
  );
}

/**
 * Admin layout — desktop-first: fixed sidebar ≥ 900px; on smaller screens a top bar
 * with a menu button that opens the same links in a drawer.
 */
export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const askLogout = () => {
    setMenuOpen(false);
    setConfirmLogout(true);
  };

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <p className={s.brand}>
          {t('app.name')} <span className={s.brandTag}>{t('roles.admin')}</span>
        </p>
        <NavLinks onLogout={askLogout} />
      </aside>

      <header className={s.topbar}>
        <button type="button" className={s.menuBtn} onClick={() => setMenuOpen(true)} aria-label={t('admin.menu')}>
          <MenuIcon size={24} />
        </button>
        <p className={s.brand}>
          {t('app.name')} <span className={s.brandTag}>{t('roles.admin')}</span>
        </p>
      </header>

      <main className={s.main}>
        <Outlet />
      </main>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={t('app.name')} side="left" width="280px">
        <NavLinks onLogout={askLogout} />
      </Drawer>

      <ConfirmDialog
        open={confirmLogout}
        title={t('admin.nav.logout')}
        confirmLabel={t('admin.nav.logout')}
        tone="danger"
        onClose={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await logout();
          navigate('/admin', { replace: true });
        }}
      />
    </div>
  );
}
