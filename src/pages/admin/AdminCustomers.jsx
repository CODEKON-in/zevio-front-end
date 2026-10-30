import { useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getCustomers, setCustomerBlocked } from '../../services/userService.js';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, SkeletonList } from '../../components/ui/index.js';
import DataTable from '../../components/admin/DataTable.jsx';
import { UserIcon } from '../../components/icons/Icons.jsx';
import { formatDate } from '../../utils/format.js';
import a from './admin.module.css';

/** Admin customers: list with order count, block / unblock. */
export default function AdminCustomers() {
  const { getPlace } = useSettings();
  const { showToast } = useToast();
  const customers = useAsync(() => getCustomers(), []);
  const [query, setQuery] = useState('');
  const [blocking, setBlocking] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (customers.data || []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers.data, query]);

  const setBlocked = async (c, isBlocked) => {
    setBusyId(c.id);
    try {
      await setCustomerBlocked(c.id, isBlocked);
      customers.setData((list) => list.map((x) => (x.id === c.id ? { ...x, isBlocked } : x)));
      showToast(isBlocked ? t('admin.customers.blockedToast', { name: c.name }) : t('admin.customers.unblockedToast', { name: c.name }), {
        type: isBlocked ? 'info' : 'success',
      });
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setBusyId(null);
      setBlocking(null);
    }
  };

  const columns = [
    { key: 'name', header: t('admin.customers.col.name'), render: (c) => <span className={a.cellMain}>{c.name || t('admin.common.none')}</span> },
    { key: 'phone', header: t('admin.customers.col.phone'), render: (c) => `+91 ${c.phone}` },
    {
      key: 'place',
      header: t('admin.customers.col.place'),
      render: (c) => getPlace(c.addresses?.[0]?.placeId)?.name || c.addresses?.[0]?.city || t('admin.common.none'),
    },
    { key: 'orders', header: t('admin.customers.col.orders'), align: 'center', render: (c) => <strong>{c.orderCount}</strong> },
    { key: 'joined', header: t('admin.customers.col.joined'), render: (c) => formatDate(c.createdAt) },
    {
      key: 'status',
      header: t('admin.customers.col.status'),
      render: (c) => <Badge tone={c.isBlocked ? 'danger' : 'success'} size="sm">{c.isBlocked ? t('admin.customers.blocked') : t('admin.customers.active')}</Badge>,
    },
    {
      key: 'actions',
      header: t('admin.common.actions'),
      align: 'right',
      render: (c) =>
        c.isBlocked ? (
          <Button variant="outline" size="sm" loading={busyId === c.id} onClick={() => setBlocked(c, false)}>
            {t('admin.customers.unblock')}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" style={{ color: 'var(--color-danger)' }} onClick={() => setBlocking(c)}>
            {t('admin.customers.block')}
          </Button>
        ),
    },
  ];

  return (
    <>
      <div className={a.head}>
        <h1 className={a.title}>{t('admin.customers.title')}</h1>
      </div>
      <div className={a.filters}>
        <Input label={t('admin.common.search')} type="search" placeholder={t('admin.customers.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <p className={a.muted} style={{ marginBottom: 'var(--space-2)' }}>
        {customers.data ? t('admin.common.results', { count: rows.length }) : ''}
      </p>

      {customers.loading && !customers.data ? (
        <SkeletonList count={4} />
      ) : customers.error && !customers.data ? (
        <ErrorState error={customers.error} onRetry={customers.reload} />
      ) : !rows.length ? (
        <EmptyState icon={<UserIcon size={36} />} message={t('admin.common.noResults')} />
      ) : (
        <DataTable caption={t('admin.customers.title')} columns={columns} rows={rows} rowClassName={(c) => (c.isBlocked ? a.dim : '')} />
      )}

      <ConfirmDialog
        open={Boolean(blocking)}
        title={blocking ? t('admin.customers.blockTitle', { name: blocking.name }) : ''}
        message={t('admin.customers.blockBody')}
        confirmLabel={t('admin.customers.block')}
        tone="danger"
        onClose={() => setBlocking(null)}
        onConfirm={() => setBlocked(blocking, true)}
      />
    </>
  );
}
