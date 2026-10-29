import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { getOrders } from '../../services/orderService.js';
import { getShops } from '../../services/shopService.js';
import { getPartners } from '../../services/userService.js';
import { Badge, Button, EmptyState, ErrorState, Input, PriceTag, Select, SkeletonList, statusTone } from '../../components/ui/index.js';
import DataTable from '../../components/admin/DataTable.jsx';
import AdminOrderDrawer from '../../components/admin/AdminOrderDrawer.jsx';
import { OrdersIcon } from '../../components/icons/Icons.jsx';
import { ORDER_STATUS } from '../../utils/constants.js';
import { formatDate, formatTime } from '../../utils/format.js';
import a from './admin.module.css';

/** Admin orders: filters (status, shop, place, date, unassigned), search, table, detail drawer. */
export default function AdminOrders() {
  const { settings, getPlace } = useSettings();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const shopId = params.get('shop') || '';
  const placeId = params.get('place') || '';
  const date = params.get('date') || '';
  const unassigned = params.get('unassigned') === '1';
  const openId = params.get('open');
  const [query, setQuery] = useState('');
  const q = useDebounce(query.trim(), 300);

  // Opening an order adds a history entry (phone Back closes the drawer); everything else replaces.
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: !(key === 'open' && value) });
  };

  const lists = useAsync(async () => {
    const [shops, partners] = await Promise.all([getShops({ includeInactive: true }), getPartners()]);
    return { shops, partners };
  }, []);

  const orders = useAsync(
    () => getOrders({ status: status || undefined, shopId: shopId || undefined, placeId: placeId || undefined, date: date ? `${date}T12:00:00` : undefined, query: q || undefined }),
    [status, shopId, placeId, date, q],
  );

  const rows = useMemo(
    () => (orders.data || []).filter((o) => !unassigned || (!o.partnerId && [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING].includes(o.status))),
    [orders.data, unassigned],
  );
  const partnerName = useMemo(() => Object.fromEntries((lists.data?.partners || []).map((p) => [p.id, p.name])), [lists.data]);

  const hasFilters = status || shopId || placeId || date || unassigned || query;
  const clearFilters = () => {
    setQuery('');
    setParams({}, { replace: true });
  };

  const columns = [
    {
      key: 'number',
      header: t('admin.orders.col.number'),
      render: (o) => (
        <button type="button" className={a.numberBtn} onClick={() => setParam('open', o.id)} aria-label={t('admin.orders.open', { number: o.number })}>
          #{o.number}
        </button>
      ),
    },
    {
      key: 'time',
      header: t('admin.orders.col.time'),
      render: (o) => (
        <>
          <span className={a.cellMain}>{formatTime(o.createdAt)}</span>
          <span className={a.cellSub}>{formatDate(o.createdAt)}</span>
        </>
      ),
    },
    { key: 'customer', header: t('admin.orders.col.customer'), render: (o) => <span className={a.cellMain}>{o.customerName}</span> },
    { key: 'shop', header: t('admin.orders.col.shop'), render: (o) => o.shopName },
    { key: 'place', header: t('admin.orders.col.place'), render: (o) => getPlace(o.address.placeId)?.name },
    { key: 'total', header: t('admin.orders.col.total'), align: 'right', render: (o) => <PriceTag amount={o.total} size="sm" /> },
    { key: 'payment', header: t('admin.orders.col.payment'), render: (o) => t(`payment.${o.paymentMethod}`) },
    { key: 'status', header: t('admin.orders.col.status'), render: (o) => <Badge tone={statusTone(o.status)} size="sm">{t(`orderStatus.${o.status}`)}</Badge> },
    {
      key: 'partner',
      header: t('admin.orders.col.partner'),
      render: (o) =>
        o.partnerId ? partnerName[o.partnerId] || o.partnerId : <span className={a.muted}>{t('admin.orders.notAssigned')}</span>,
    },
  ];

  return (
    <>
      <div className={a.head}>
        <h1 className={a.title}>{t('admin.orders.title')}</h1>
      </div>

      <div className={a.filters}>
        <Input className={a.filterWide} label={t('admin.common.search')} type="search" placeholder={t('admin.orders.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select
          label={t('admin.orders.status')}
          value={status}
          onChange={(e) => setParam('status', e.target.value)}
          options={[{ value: '', label: t('admin.common.all') }, ...Object.values(ORDER_STATUS).map((st) => ({ value: st, label: t(`orderStatus.${st}`) }))]}
        />
        <Select
          label={t('admin.orders.shop')}
          value={shopId}
          onChange={(e) => setParam('shop', e.target.value)}
          options={[{ value: '', label: t('admin.common.all') }, ...(lists.data?.shops || []).map((x) => ({ value: x.id, label: x.name }))]}
        />
        <Select
          label={t('admin.orders.place')}
          value={placeId}
          onChange={(e) => setParam('place', e.target.value)}
          options={[{ value: '', label: t('admin.common.all') }, ...settings.servicePlaces.map((pl) => ({ value: pl.id, label: pl.name }))]}
        />
        <Input label={t('admin.orders.date')} type="date" value={date} onChange={(e) => setParam('date', e.target.value)} />
        <label className={`${a.check} ${a.filterWide}`}>
          <input type="checkbox" checked={unassigned} onChange={(e) => setParam('unassigned', e.target.checked ? '1' : '')} />
          {t('admin.orders.unassigned')}
        </label>
      </div>

      <div className={a.resultsRow}>
        <p className={a.muted} aria-live="polite">
          {orders.data ? t('admin.common.results', { count: rows.length }) : ''}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t('admin.common.clearFilters')}
          </Button>
        )}
      </div>

      {orders.loading && !orders.data ? (
        <SkeletonList count={5} />
      ) : orders.error && !orders.data ? (
        <ErrorState error={orders.error} onRetry={orders.reload} />
      ) : !rows.length ? (
        <EmptyState icon={<OrdersIcon size={36} />} message={t('admin.common.noResults')} />
      ) : (
        <DataTable caption={t('admin.orders.title')} columns={columns} rows={rows} onRowClick={(o) => setParam('open', o.id)} />
      )}

      <AdminOrderDrawer
        orderId={openId}
        partners={lists.data?.partners || []}
        onClose={() => setParam('open', '')}
        onChanged={orders.reload}
      />
    </>
  );
}
