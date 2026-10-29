import { t } from '../../i18n/index.js';
import TabBar from '../layout/TabBar.jsx';
import { BikeIcon, OrdersIcon, UserIcon } from '../icons/Icons.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';
import { ACTIVE_STATUSES } from '../../utils/constants.js';

/** Delivery app bottom tabs: Orders (active count), History, Account. */
export default function DeliveryTabBar() {
  const { orders } = useDelivery();
  const active = orders?.filter((o) => ACTIVE_STATUSES.includes(o.status)).length || 0;
  return (
    <TabBar
      label={t('delivery.navLabel')}
      items={[
        { to: '/delivery', end: true, label: t('delivery.nav.home'), Icon: BikeIcon, badge: active },
        { to: '/delivery/history', label: t('delivery.nav.history'), Icon: OrdersIcon },
        { to: '/delivery/account', label: t('delivery.nav.account'), Icon: UserIcon },
      ]}
    />
  );
}
