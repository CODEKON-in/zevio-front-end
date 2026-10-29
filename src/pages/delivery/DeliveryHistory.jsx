import { useMemo } from 'react';
import { t } from '../../i18n/index.js';
import { useDelivery } from '../../context/DeliveryContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/index.js';
import DeliveryOrderCard from '../../components/delivery/DeliveryOrderCard.jsx';
import { OrdersIcon } from '../../components/icons/Icons.jsx';
import { FINISHED_STATUSES, ORDER_STATUS } from '../../utils/constants.js';
import { formatDate, formatPrice } from '../../utils/format.js';
import { cashToCollect, dayKey, deliveredAt } from '../../utils/orders.js';
import p from '../../styles/page.module.css';
import s from './DeliveryHistory.module.css';

/** Past orders grouped by date (newest day first), with daily totals. */
export default function DeliveryHistory() {
  const { orders, ordersLoading, ordersError, reloadOrders } = useDelivery();
  const { settings } = useSettings();

  const days = useMemo(() => {
    const finished = (orders || []).filter((o) => FINISHED_STATUSES.includes(o.status));
    const groups = new Map();
    for (const o of finished) {
      const when = deliveredAt(o) || o.statusHistory[o.statusHistory.length - 1]?.at || o.createdAt;
      const key = dayKey(when);
      if (!groups.has(key)) groups.set(key, { key, date: when, orders: [] });
      groups.get(key).orders.push(o);
    }
    return [...groups.values()]
      .sort((a, b) => (a.key < b.key ? 1 : -1))
      .map((g) => {
        const delivered = g.orders.filter((o) => o.status === ORDER_STATUS.DELIVERED);
        return {
          ...g,
          count: delivered.length,
          earnings: delivered.length * settings.partnerIncentive,
          cash: delivered.reduce((sum, o) => sum + cashToCollect(o), 0),
        };
      });
  }, [orders, settings.partnerIncentive]);

  return (
    <main className={p.page}>
      <h1 className={s.title}>{t('delivery.history.title')}</h1>
      {ordersLoading && !orders ? (
        <SkeletonList count={3} />
      ) : ordersError && !orders ? (
        <ErrorState error={ordersError} onRetry={reloadOrders} />
      ) : !days.length ? (
        <EmptyState icon={<OrdersIcon size={36} />} title={t('delivery.history.emptyTitle')} message={t('delivery.history.emptyMessage')} />
      ) : (
        days.map((day) => (
          <section key={day.key} className={s.day} aria-labelledby={`day-${day.key}`}>
            <div className={s.dayHead}>
              <h2 id={`day-${day.key}`} className={s.date}>{formatDate(day.date)}</h2>
              <p className={p.muted}>
                {t('delivery.history.dayTotals', { count: day.count, earnings: formatPrice(day.earnings), cash: formatPrice(day.cash) })}
              </p>
            </div>
            <ul className={p.list}>
              {day.orders.map((o) => (
                <DeliveryOrderCard key={o.id} order={o} />
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
