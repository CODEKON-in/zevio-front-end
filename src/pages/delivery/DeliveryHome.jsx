import { useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { assignOrderTo } from '../../services/devService.js';
import { Button, EmptyState, ErrorState, PriceTag, Skeleton, SkeletonList, Toggle } from '../../components/ui/index.js';
import DeliveryOrderCard from '../../components/delivery/DeliveryOrderCard.jsx';
import { BikeIcon, WifiOffIcon } from '../../components/icons/Icons.jsx';
import { ACTIVE_STATUSES, IS_DEV, ORDER_STATUS } from '../../utils/constants.js';
import { formatPrice, isToday } from '../../utils/format.js';
import { cashToCollect, deliveredAt } from '../../utils/orders.js';
import p from '../../styles/page.module.css';
import PendingApproval from '../../components/account/PendingApproval.jsx';
import s from './DeliveryHome.module.css';

// Ready orders first (go to shop now), then picked up, then still being prepared.
const STATUS_ORDER = { PREPARING: 0, OUT_FOR_DELIVERY: 1, CONFIRMED: 2, PENDING: 3 };

/** Delivery home: big Online/Offline switch, today's summary, assigned active orders. */
export default function DeliveryHome() {
  const { user } = useAuth();
  const { partner, setOnline, orders, ordersLoading, ordersError, reloadOrders } = useDelivery();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [toggling, setToggling] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const active = useMemo(
    () =>
      (orders || [])
        .filter((o) => ACTIVE_STATUSES.includes(o.status))
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || new Date(a.createdAt) - new Date(b.createdAt)),
    [orders],
  );

  const today = useMemo(() => {
    const done = (orders || []).filter((o) => o.status === ORDER_STATUS.DELIVERED && isToday(deliveredAt(o)));
    return {
      count: done.length,
      earnings: done.length * settings.partnerIncentive,
      cash: done.reduce((sum, o) => sum + cashToCollect(o), 0),
    };
  }, [orders, settings.partnerIncentive]);

  const toggle = async (next) => {
    setToggling(true);
    try {
      await setOnline(next);
      showToast(next ? t('delivery.home.nowOnline') : t('delivery.home.nowOffline'), { type: next ? 'success' : 'info' });
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setToggling(false);
    }
  };

  const devAssign = async () => {
    setAssigning(true);
    try {
      await assignOrderTo(user.partnerId);
      await reloadOrders();
    } catch {
      showToast(t('delivery.home.devNone'), { type: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <main className={p.page}>
      <h1 className={s.hello}>{t('delivery.home.hello', { name: user.name })}</h1>

      {partner && !partner.isActive && <PendingApproval kind="delivery" />}
      {partner ? (
        <Toggle
          disabled={!partner.isActive}
          size="lg"
          className={s.toggle}
          label={t('delivery.home.status')}
          description={partner.isOnline ? t('delivery.home.onlineDesc') : t('delivery.home.offlineDesc')}
          onText={t('delivery.home.online')}
          offText={t('delivery.home.offline')}
          checked={partner.isOnline}
          loading={toggling}
          onChange={toggle}
        />
      ) : (
        <Skeleton height={84} radius="var(--radius-lg)" className={s.toggle} />
      )}

      <section className={s.summary} aria-labelledby="today-title">
        <h2 id="today-title" className={s.summaryTitle}>{t('delivery.home.today')}</h2>
        <div className={s.stats}>
          <div className={s.stat}>
            <span className={s.statValue}>{orders ? today.count : '–'}</span>
            <span className={s.statLabel}>{t('delivery.home.delivered')}</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>{orders ? <PriceTag amount={today.earnings} size="lg" /> : '–'}</span>
            <span className={s.statLabel}>{t('delivery.home.incentive')}</span>
            <span className={s.statHint}>{t('delivery.home.incentiveHint', { amount: formatPrice(settings.partnerIncentive) })}</span>
          </div>
          <div className={`${s.stat} ${today.cash > 0 ? s.cash : ''}`}>
            <span className={s.statValue}>{orders ? <PriceTag amount={today.cash} size="lg" /> : '–'}</span>
            <span className={s.statLabel}>{t('delivery.home.cash')}</span>
          </div>
        </div>
      </section>

      <section className={p.section} aria-labelledby="active-title">
        <h2 id="active-title" className={p.sectionTitle}>
          {t('delivery.home.activeTitle')} {active.length > 0 && <span className={p.muted}>({active.length})</span>}
        </h2>
        {partner && !partner.isOnline && (
          <p className={s.offline} role="status">
            <WifiOffIcon size={20} />
            {t('delivery.home.offlineBanner')}
          </p>
        )}
        {ordersLoading && !orders ? (
          <SkeletonList count={2} />
        ) : ordersError && !orders ? (
          <ErrorState error={ordersError} onRetry={reloadOrders} />
        ) : !active.length ? (
          <EmptyState icon={<BikeIcon size={36} />} title={t('delivery.home.emptyTitle')} message={t('delivery.home.emptyMessage')} />
        ) : (
          <ul className={p.list}>
            {active.map((o) => (
              <DeliveryOrderCard key={o.id} order={o} />
            ))}
          </ul>
        )}
      </section>

      {IS_DEV && (
        <Button variant="ghost" block loading={assigning} onClick={devAssign} className={s.dev}>
          {t('delivery.home.devAssign')}
        </Button>
      )}
    </main>
  );
}
