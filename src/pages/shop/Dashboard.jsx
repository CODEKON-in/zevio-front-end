import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useShopPanel } from '../../context/ShopPanelContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { updateOrderStatus } from '../../services/orderService.js';
import { Button, EmptyState, ErrorState, PriceTag, Skeleton, SkeletonList, Toggle } from '../../components/ui/index.js';
import ShopOrderCard from '../../components/shop/ShopOrderCard.jsx';
import PendingApproval from '../../components/account/PendingApproval.jsx';
import SubscriptionBanner from '../../components/shop/SubscriptionBanner.jsx';
import { OrdersIcon } from '../../components/icons/Icons.jsx';
import { ORDER_STATUS } from '../../utils/constants.js';
import { isToday } from '../../utils/format.js';
import p from '../../styles/page.module.css';
import s from './Dashboard.module.css';

const TABS = {
  new: (o) => o.status === ORDER_STATUS.PENDING,
  confirmed: (o) => o.status === ORDER_STATUS.CONFIRMED,
  preparing: (o) => o.status === ORDER_STATUS.PREPARING,
  completed: (o) =>
    [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(o.status) && isToday(o.createdAt),
};
const TAB_KEYS = Object.keys(TABS);

/** Shop dashboard: Open/Closed switch, today's numbers, orders by status. */
export default function Dashboard() {
  const { shop, shopError, reloadShop, updateShop, orders, ordersLoading, ordersError, reloadOrders, freshIds, markSeen } = useShopPanel();
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TAB_KEYS.includes(params.get('tab')) ? params.get('tab') : 'new';
  const [toggling, setToggling] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const stats = useMemo(() => {
    const today = (orders || []).filter((o) => isToday(o.createdAt));
    const valid = today.filter((o) => o.status !== ORDER_STATUS.CANCELLED);
    return { count: today.length, sales: valid.reduce((sum, o) => sum + o.itemTotal, 0) };
  }, [orders]);

  const counts = useMemo(() => Object.fromEntries(TAB_KEYS.map((k) => [k, (orders || []).filter(TABS[k]).length])), [orders]);
  const list = useMemo(() => {
    const filtered = (orders || []).filter(TABS[tab]);
    // New orders: oldest first so the longest-waiting customer is on top.
    return tab === 'new' ? [...filtered].reverse() : filtered;
  }, [orders, tab]);

  const toggleOpen = async (next) => {
    setToggling(true);
    try {
      await updateShop({ isOpen: next });
      showToast(next ? t('shopPanel.dashboard.opened') : t('shopPanel.dashboard.closed'), { type: next ? 'success' : 'info' });
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setToggling(false);
    }
  };

  const quickAction = async (order) => {
    const next = order.status === ORDER_STATUS.PENDING ? ORDER_STATUS.CONFIRMED : ORDER_STATUS.PREPARING;
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, next);
      markSeen(order.id);
      showToast(next === ORDER_STATUS.CONFIRMED ? t('shopPanel.order.accepted') : t('shopPanel.order.ready'), { type: 'success' });
      await reloadOrders();
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
      reloadOrders();
    } finally {
      setBusyId(null);
    }
  };


  if (shopError && !shop) return <ErrorState error={shopError} onRetry={reloadShop} />;

  return (
    <main className={p.page}>
      <header className={s.header}>
        <p className={p.muted}>{t('shopPanel.dashboard.title')}</p>
        <h1 className={s.shopName}>{shop ? shop.name : <Skeleton width="60%" height={28} />}</h1>
      </header>

      {shop && !shop.isActive && <PendingApproval kind="shop" />}
      {shop && <SubscriptionBanner subscription={shop.subscription} />}

      {shop ? (
        <Toggle
          size="lg"
          className={s.toggle}
          label={t('shopPanel.dashboard.shopStatus')}
          description={shop.isOpen ? t('shopPanel.dashboard.openDesc') : t('shopPanel.dashboard.closedDesc')}
          onText={t('common.open')}
          offText={t('common.closed')}
          checked={shop.isOpen}
          loading={toggling}
          onChange={toggleOpen}
        />
      ) : (
        <Skeleton height={84} radius="var(--radius-lg)" className={s.toggle} />
      )}

      <div className={s.stats}>
        <div className={s.stat}>
          <span className={s.statLabel}>{t('shopPanel.dashboard.todayOrders')}</span>
          <span className={s.statValue}>{orders ? stats.count : '–'}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>{t('shopPanel.dashboard.todaySales')}</span>
          <span className={s.statValue}>{orders ? <PriceTag amount={stats.sales} size="lg" /> : '–'}</span>
        </div>
      </div>

      <div className={s.tabs} role="tablist" aria-label={t('shopPanel.dashboard.tabsLabel')}>
        {TAB_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls="orders-panel"
            className={`${s.tab} ${tab === k ? s.tabActive : ''}`}
            onClick={() => setParams(k === 'new' ? {} : { tab: k }, { replace: true })}
          >
            {t(`shopPanel.dashboard.tabs.${k}`)}
            {counts[k] > 0 && <span className={`${s.count} ${k === 'new' ? s.countNew : ''}`}>{counts[k]}</span>}
          </button>
        ))}
      </div>

      <section id="orders-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className={s.panel}>
        {ordersLoading && !orders ? (
          <SkeletonList count={3} />
        ) : ordersError && !orders ? (
          <ErrorState error={ordersError} onRetry={reloadOrders} />
        ) : !list.length ? (
          <EmptyState icon={<OrdersIcon size={36} />} title={t('common.emptyTitle')} message={t(`shopPanel.dashboard.empty.${tab}`)} />
        ) : (
          <ul className={p.list}>
            {list.map((o) => (
              <ShopOrderCard key={o.id} order={o} fresh={freshIds.has(o.id)} onQuickAction={quickAction} busy={busyId === o.id} />
            ))}
          </ul>
        )}
      </section>

      {tab === 'new' && <p className={s.hint}>{t('shopPanel.dashboard.soundHint')}</p>}
    </main>
  );
}
