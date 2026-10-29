import { useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getShops, setShopActive } from '../../services/shopService.js';
import { Badge, Button, EmptyState, ErrorState, Input, Select, SkeletonList, Toggle } from '../../components/ui/index.js';
import DataTable from '../../components/admin/DataTable.jsx';
import ShopFormDrawer from '../../components/admin/ShopFormDrawer.jsx';
import { EditIcon, PlusIcon, StoreIcon } from '../../components/icons/Icons.jsx';
import { SHOP_CATEGORIES, SUBSCRIPTION_STATUS } from '../../utils/constants.js';
import { daysUntil, formatDate } from '../../utils/format.js';
import a from './admin.module.css';

const SUB_TONE = { ACTIVE: 'success', TRIAL: 'info', EXPIRED: 'danger' };

/** Admin shops: table, add/edit drawer, activate/deactivate. */
export default function AdminShops() {
  const { getPlace } = useSettings();
  const { showToast } = useToast();
  const shops = useAsync(() => getShops({ includeInactive: true }), []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | shop
  const [busyId, setBusyId] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (shops.data || [])
      .filter((x) => !category || x.category === category)
      .filter((x) => !q || x.name.toLowerCase().includes(q) || x.ownerName.toLowerCase().includes(q))
      .sort((x, y) => x.name.localeCompare(y.name));
  }, [shops.data, query, category]);

  const toggleActive = async (shop, isActive) => {
    setBusyId(shop.id);
    try {
      await setShopActive(shop.id, isActive);
      shops.setData((list) => list.map((x) => (x.id === shop.id ? { ...x, isActive } : x)));
      showToast(isActive ? t('admin.shops.activated', { name: shop.name }) : t('admin.shops.deactivated', { name: shop.name }), {
        type: isActive ? 'success' : 'info',
      });
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'shop',
      header: t('admin.shops.col.shop'),
      render: (x) => (
        <>
          <span className={a.cellMain}>{x.name}</span>
          <span className={a.cellSub}>{t(`categories.${x.category}`)}</span>
        </>
      ),
    },
    { key: 'place', header: t('admin.shops.col.place'), render: (x) => getPlace(x.placeId)?.name },
    {
      key: 'owner',
      header: t('admin.shops.col.owner'),
      render: (x) => (
        <>
          {x.ownerName}
          <span className={a.cellSub}>+91 {x.phone}</span>
        </>
      ),
    },
    {
      key: 'open',
      header: t('admin.shops.col.open'),
      render: (x) => <Badge tone={x.isOpen ? 'success' : 'neutral'} size="sm">{x.isOpen ? t('common.open') : t('common.closed')}</Badge>,
    },
    {
      key: 'sub',
      header: t('admin.shops.col.subscription'),
      render: (x) => {
        const expired = x.subscription.status === SUBSCRIPTION_STATUS.EXPIRED || daysUntil(x.subscription.endDate) < 0;
        const status = expired ? SUBSCRIPTION_STATUS.EXPIRED : x.subscription.status;
        return (
          <>
            <Badge tone={SUB_TONE[status]} size="sm">{t(`subscription.${status}`)}</Badge>
            <span className={a.cellSub}>
              {x.subscription.endDate ? `${x.subscription.plan} · ${t('admin.shops.validTill', { date: formatDate(x.subscription.endDate) })}` : t('admin.shops.noSubscription')}
            </span>
          </>
        );
      },
    },
    {
      key: 'active',
      header: t('admin.shops.col.active'),
      render: (x) => (
        <Toggle
          label=""
          ariaLabel={t('admin.shops.activeAria', { name: x.name })}
          checked={x.isActive}
          loading={busyId === x.id}
          onChange={(v) => toggleActive(x, v)}
        />
      ),
    },
    {
      key: 'actions',
      header: t('admin.common.actions'),
      align: 'right',
      render: (x) => (
        <Button variant="ghost" size="sm" iconLeft={<EditIcon size={16} />} aria-label={t('admin.shops.editAria', { name: x.name })} onClick={() => setEditing(x)}>
          {t('admin.common.edit')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className={a.head}>
        <h1 className={a.title}>{t('admin.shops.title')}</h1>
        <Button iconLeft={<PlusIcon size={20} />} onClick={() => setEditing('new')}>
          {t('admin.shops.add')}
        </Button>
      </div>

      <div className={a.filters}>
        <Input className={a.filterWide} label={t('admin.common.search')} type="search" placeholder={t('admin.shops.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select
          label={t('admin.shops.category')}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: '', label: t('admin.common.all') }, ...SHOP_CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))]}
        />
      </div>
      <p className={a.muted} style={{ marginBottom: 'var(--space-2)' }}>
        {shops.data ? t('admin.common.results', { count: rows.length }) : ''}
      </p>

      {shops.loading && !shops.data ? (
        <SkeletonList count={5} />
      ) : shops.error && !shops.data ? (
        <ErrorState error={shops.error} onRetry={shops.reload} />
      ) : !rows.length ? (
        <EmptyState icon={<StoreIcon size={36} />} message={t('admin.common.noResults')} />
      ) : (
        <DataTable caption={t('admin.shops.title')} columns={columns} rows={rows} rowClassName={(x) => (x.isActive ? '' : a.dim)} />
      )}

      <ShopFormDrawer
        open={Boolean(editing)}
        shop={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => shops.reload()}
      />
    </>
  );
}
