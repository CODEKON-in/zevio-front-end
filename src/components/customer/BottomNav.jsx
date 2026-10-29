import { t } from '../../i18n/index.js';
import TabBar from '../layout/TabBar.jsx';
import { HomeIcon, OrdersIcon, SearchIcon, UserIcon } from '../icons/Icons.jsx';

const ITEMS = [
  { to: '/', key: 'home', Icon: HomeIcon, end: true },
  { to: '/search', key: 'search', Icon: SearchIcon },
  { to: '/orders', key: 'orders', Icon: OrdersIcon },
  { to: '/profile', key: 'profile', Icon: UserIcon },
];

/** Customer bottom tabs: Home, Search, Orders, Profile. */
export default function BottomNav() {
  return <TabBar label={t('nav.label')} items={ITEMS.map((i) => ({ ...i, label: t(`nav.${i.key}`) }))} />;
}
