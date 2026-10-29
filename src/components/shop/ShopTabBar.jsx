import { t } from '../../i18n/index.js';
import TabBar from '../layout/TabBar.jsx';
import { BoxIcon, OrdersIcon, StoreIcon } from '../icons/Icons.jsx';
import { useShopPanel } from '../../context/ShopPanelContext.jsx';
import { ORDER_STATUS } from '../../utils/constants.js';

/** Shop panel bottom tabs: Orders (with new-order count), Products, Shop. */
export default function ShopTabBar() {
  const { orders } = useShopPanel();
  const newCount = orders?.filter((o) => o.status === ORDER_STATUS.PENDING).length || 0;
  return (
    <TabBar
      label={t('shopPanel.navLabel')}
      items={[
        { to: '/shop-panel', end: true, label: t('shopPanel.nav.orders'), Icon: OrdersIcon, badge: newCount },
        { to: '/shop-panel/products', label: t('shopPanel.nav.products'), Icon: BoxIcon },
        { to: '/shop-panel/settings', label: t('shopPanel.nav.settings'), Icon: StoreIcon },
      ]}
    />
  );
}
