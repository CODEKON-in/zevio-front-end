import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { ROLES } from '../../services/adminAuth/index.js';
import Drawer from '../ui/Drawer.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { BikeIcon, GridIcon, LockIcon, LogoutIcon, MenuIcon, OrdersIcon, StoreIcon, UserIcon, SlidersIcon } from '../icons/Icons.jsx';
import { ADMIN_BASE } from '../../utils/constants.js';
import s from './AdminLayout.module.css';
import MyntLogo from '../brand/MyntLogo.jsx';

const SUPER = [ROLES.SUPERADMIN];
const BOTH = [ROLES.SUPERADMIN, ROLES.SHOP_OWNER];

/** Each link says which roles see it; the routes (AdminApp) enforce the same. */
const LINKS = [
  { to: ADMIN_BASE, key: 'dashboard', Icon: GridIcon, end: true, roles: SUPER },
  { to: `${ADMIN_BASE}/my-shop`, key: 'myShop', Icon: StoreIcon, roles: [ROLES.SHOP_OWNER] },
  { to: `${ADMIN_BASE}/orders`, key: 'orders', Icon: OrdersIcon, roles: BOTH },
  { to: `${ADMIN_BASE}/shops`, key: 'shops', Icon: StoreIcon, roles: SUPER },
  { to: `${ADMIN_BASE}/partners`, key: 'partners', Icon: BikeIcon, roles: SUPER },
  { to: `${ADMIN_BASE}/customers`, key: 'customers', Icon: UserIcon, roles: SUPER },
  { to: `${ADMIN_BASE}/settings`, key: 'settings', Icon: SlidersIcon, roles: SUPER },
  { to: `${ADMIN_BASE}/access`, key: 'access', Icon: LockIcon, roles: SUPER },
];

function NavLinks({ onLogout, role, email }) {
  return (
    <nav aria-label={t('admin.navLabel')} className={s.nav}>
      <ul>
        {LINKS.filter((l) => l.roles.includes(role)).map(({ to, key, Icon, end }) => (
          <li key={key}>
            <NavLink to={to} end={end} className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
              <Icon size={20} />
              {t(`admin.nav.${key}`)}
            </NavLink>
          </li>
        ))}
      </ul>
      <p className={s.who}>{t('admin.login.signedInAs', { email })}</p>
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
  const { signOut, admin } = useAdminAuth();
  const nav = { onLogout: () => {}, role: admin?.role, email: admin?.email };
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
          <MyntLogo size={24} /> <span className={s.brandTag}>{admin?.role === ROLES.SHOP_OWNER ? t('admin.access.roles.shop_owner') : t('roles.admin')}</span>
        </p>
        <NavLinks {...nav} onLogout={askLogout} />
      </aside>

      <header className={s.topbar}>
        <button type="button" className={s.menuBtn} onClick={() => setMenuOpen(true)} aria-label={t('admin.menu')}>
          <MenuIcon size={24} />
        </button>
        <p className={s.brand}>
          <MyntLogo size={20} /> <span className={s.brandTag}>{admin?.role === ROLES.SHOP_OWNER ? t('admin.access.roles.shop_owner') : t('roles.admin')}</span>
        </p>
      </header>

      <main className={s.main}>
        <Outlet />
      </main>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={t('app.name')} side="left" width="280px">
        <NavLinks {...nav} onLogout={askLogout} />
      </Drawer>

      <ConfirmDialog
        open={confirmLogout}
        title={t('admin.nav.logout')}
        confirmLabel={t('admin.nav.logout')}
        tone="danger"
        onClose={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await signOut();
          navigate(`${ADMIN_BASE}/login`, { replace: true });
        }}
      />
    </div>
  );
}
