import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAsync } from '../../hooks/useAsync.js';
import { getDailyOrderCounts, getOrders } from '../../services/orderService.js';
import { getShops } from '../../services/shopService.js';
import { getPartners } from '../../services/userService.js';
import { Badge, Card, ErrorState, PriceTag, Skeleton, statusTone } from '../../components/ui/index.js';
import StatCard from '../../components/admin/StatCard.jsx';
import BarChart from '../../components/admin/BarChart.jsx';
import { AlertIcon, BikeIcon, CheckIcon, CloseIcon, OrdersIcon, StoreIcon } from '../../components/icons/Icons.jsx';
import { ORDER_STATUS } from '../../utils/constants.js';
import { formatDate, formatTime, isToday } from '../../utils/format.js';
import { deliveredAt } from '../../utils/orders.js';
import a from './admin.module.css';
import s from './AdminDashboard.module.css';

const REFRESH_MS = 30000;
const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });

/** Admin dashboard: today's numbers, 7-day bar chart, recent orders. */
export default function AdminDashboard() {
  const data = useAsync(async () => {
    const [orders, shops, partners, daily] = await Promise.all([
      getOrders(),
      getShops({ includeInactive: true }),
      getPartners(),
      getDailyOrderCounts(7),
    ]);
    return { orders, shops, partners, daily };
  }, []);

  useEffect(() => {
    const timer = setInterval(data.reload, REFRESH_MS);
    return () => clearInterval(timer);
  }, [data.reload]);

  const stats = useMemo(() => {
    if (!data.data) return null;
    const { orders, shops, partners } = data.data;
    const today = orders.filter((o) => isToday(o.createdAt));
    const deliveredToday = orders.filter((o) => o.status === ORDER_STATUS.DELIVERED && isToday(deliveredAt(o)));
    return {
      todayCount: today.length,
      delivered: deliveredToday.length,
      cancelled: today.filter((o) => o.status === ORDER_STATUS.CANCELLED).length,
      revenue: deliveredToday.reduce((sum, o) => sum + o.deliveryFee, 0),
      activeShops: shops.filter((x) => x.isActive).length,
      openShops: shops.filter((x) => x.isActive && x.isOpen).length,
      online: partners.filter((x) => x.isOnline && x.isActive).length,
      partners: partners.filter((x) => x.isActive).length,
      needPartner: orders.filter((o) => !o.partnerId && (o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.PREPARING)).length,
    };
  }, [data.data]);

  const chart = useMemo(
    () =>
      (data.data?.daily || []).map((d) => {
        const label = `${weekday.format(new Date(d.date))} ${formatDate(d.date).slice(0, 5)}`;
        return { label, value: d.count, title: t('admin.dashboard.chartBar', { day: label, count: d.count }) };
      }),
    [data.data],
  );

  return (
    <>
      <div className={a.head}>
        <div>
          <h1 className={a.title}>{t('admin.dashboard.title')}</h1>
          <p className={a.muted}>{t('admin.dashboard.today', { date: formatDate(new Date().toISOString()) })}</p>
        </div>
      </div>

      {data.error && !data.data ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : !stats ? (
        <div className={s.grid}>
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} height={110} radius="var(--radius-lg)" />
          ))}
        </div>
      ) : (
        <>
          <div className={s.grid}>
            <StatCard label={t('admin.dashboard.todayOrders')} value={stats.todayCount} icon={<OrdersIcon size={20} />} tone="primary" to="/admin/orders" />
            <StatCard label={t('admin.dashboard.delivered')} value={stats.delivered} icon={<CheckIcon size={20} />} tone="success" />
            <StatCard label={t('admin.dashboard.cancelled')} value={stats.cancelled} icon={<CloseIcon size={20} />} tone="danger" />
            <StatCard
              label={t('admin.dashboard.revenue')}
              value={<PriceTag amount={stats.revenue} size="xl" />}
              hint={t('admin.dashboard.revenueHint')}
              tone="success"
            />
            <StatCard
              label={t('admin.dashboard.activeShops')}
              value={stats.activeShops}
              hint={t('admin.dashboard.openNow', { count: stats.openShops })}
              icon={<StoreIcon size={20} />}
              to="/admin/shops"
            />
            <StatCard
              label={t('admin.dashboard.onlinePartners')}
              value={
                <>
                  {stats.online} <span className={s.of}>{t('admin.dashboard.ofTotal', { count: stats.partners })}</span>
                </>
              }
              icon={<BikeIcon size={20} />}
              to="/admin/partners"
            />
            <StatCard
              label={t('admin.dashboard.needPartner')}
              value={stats.needPartner}
              hint={t('admin.dashboard.needPartnerHint')}
              icon={<AlertIcon size={20} />}
              tone={stats.needPartner ? 'warning' : 'neutral'}
              to="/admin/orders?unassigned=1"
            />
          </div>

          <div className={s.lower}>
            <Card>
              <h2 className={a.blockTitle}>{t('admin.dashboard.chartTitle')}</h2>
              <BarChart data={chart} ariaLabel={t('admin.dashboard.chartLabel')} />
            </Card>

            <Card>
              <div className={s.recentHead}>
                <h2 className={a.blockTitle} style={{ margin: 0 }}>{t('admin.dashboard.recent')}</h2>
                <Link to="/admin/orders" className={s.viewAll}>{t('admin.dashboard.viewAll')}</Link>
              </div>
              <ul className={s.recent}>
                {data.data.orders.slice(0, 6).map((o) => (
                  <li key={o.id}>
                    <Link to={`/admin/orders?open=${o.id}`} className={s.recentRow}>
                      <span>
                        <span className={a.cellMain}>#{o.number} · {o.shopName}</span>
                        <span className={a.cellSub}>
                          {o.customerName} · {formatTime(o.createdAt)}
                        </span>
                      </span>
                      <Badge tone={statusTone(o.status)} size="sm">{t(`orderStatus.${o.status}`)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
