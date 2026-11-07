import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getShopById } from '../../services/shopService.js';
import { deleteProduct, getProductsByShop, saveProduct } from '../../services/productService.js';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, PriceTag, SkeletonList, Toggle, VegDot } from '../../components/ui/index.js';
import DataTable from '../../components/admin/DataTable.jsx';
import ProductFormDrawer from '../../components/admin/ProductFormDrawer.jsx';
import { BagIcon, ChevronLeftIcon, EditIcon, PlusIcon, TrashIcon } from '../../components/icons/Icons.jsx';
import { ADMIN_BASE } from '../../utils/constants.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { lineMin } from '../../utils/productRules.js';
import a from './admin.module.css';

/**
 * AdminProducts — one shop's menu: add, edit, delete, and the in-stock switch.
 *
 * This is what the shop owner's own panel used to do. Nothing about the data
 * changed when that panel went away: these are the same products the customer
 * app reads, so a minimum set here shows as a "Min 3" badge on the menu and
 * stops the cart's minus button at three.
 *
 * Route: <admin>/shops/:shopId/products
 */
export default function AdminProducts() {
  const { shopId } = useParams();
  const { isShopOwner } = useAdminAuth();
  const { showToast } = useToast();
  const shop = useAsync(() => getShopById(shopId), [shopId]);
  const products = useAsync(() => getProductsByShop(shopId), [shopId]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [stockBusyId, setStockBusyId] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products.data || [])
      .filter((x) => !q || x.name.toLowerCase().includes(q) || (x.section || '').toLowerCase().includes(q))
      // Grouped by menu heading, the way the customer sees it.
      .sort((x, y) => (x.section || '').localeCompare(y.section || '') || x.name.localeCompare(y.name));
  }, [products.data, query]);

  const sections = useMemo(() => (products.data || []).map((x) => x.section), [products.data]);

  const toggleStock = async (product, inStock) => {
    setStockBusyId(product.id);
    try {
      await saveProduct({ id: product.id, shopId, inStock });
      products.setData((list) => list.map((x) => (x.id === product.id ? { ...x, inStock } : x)));
      showToast(inStock ? t('admin.products.backInStock', { name: product.name }) : t('admin.products.outOfStock', { name: product.name }), {
        type: inStock ? 'success' : 'info',
      });
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setStockBusyId(null);
    }
  };

  const doDelete = async () => {
    const victim = confirmDelete;
    try {
      await deleteProduct(victim.id);
      products.setData((list) => list.filter((x) => x.id !== victim.id));
      showToast(t('admin.products.deleted', { name: victim.name }), { type: 'success' });
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setConfirmDelete(null);
    }
  };

  const columns = [
    {
      key: 'item',
      header: t('admin.products.col.item'),
      render: (x) => (
        <>
          <span className={a.cellMain}>
            <VegDot isVeg={x.isVeg} /> {x.name}
          </span>
          {x.description ? (
            <span className={a.cellSub}>{x.description}</span>
          ) : (
            <span className={a.cellSub}>{t('admin.products.noDescription')}</span>
          )}
        </>
      ),
    },
    {
      key: 'section',
      header: t('admin.products.col.section'),
      render: (x) => x.section || t('admin.common.none'),
    },
    {
      key: 'price',
      header: t('admin.products.col.price'),
      render: (x) => <PriceTag amount={x.price} />,
    },
    {
      key: 'min',
      header: t('admin.products.col.min'),
      // Nothing at all for the ordinary item that sells one at a time.
      render: (x) => (lineMin(x) > 1 ? <Badge tone="info" size="sm">{t('product.minOrder', { count: lineMin(x) })}</Badge> : <span className={a.muted}>—</span>),
    },
    {
      key: 'stock',
      header: t('admin.products.col.stock'),
      render: (x) => (
        <Toggle
          label=""
          ariaLabel={t('admin.products.stockAria', { name: x.name })}
          checked={x.inStock}
          loading={stockBusyId === x.id}
          onChange={(v) => toggleStock(x, v)}
        />
      ),
    },
    {
      key: 'actions',
      header: t('admin.common.actions'),
      align: 'right',
      render: (x) => (
        <span className={a.rowActions}>
          <Button variant="ghost" size="sm" iconLeft={<EditIcon size={16} />} aria-label={t('admin.products.editAria', { name: x.name })} onClick={() => setEditing(x)}>
            {t('admin.common.edit')}
          </Button>
          <Button variant="ghost" size="sm" iconLeft={<TrashIcon size={16} />} aria-label={t('admin.products.deleteAria', { name: x.name })} onClick={() => setConfirmDelete(x)}>
            {t('admin.common.delete')}
          </Button>
        </span>
      ),
    },
  ];

  const loading = products.loading && !products.data;

  return (
    <>
      <Button as={Link} to={isShopOwner ? `${ADMIN_BASE}/my-shop` : `${ADMIN_BASE}/shops`} variant="ghost" size="sm" iconLeft={<ChevronLeftIcon size={18} />}>
        {isShopOwner ? t('admin.nav.myShop') : t('admin.products.backToShops')}
      </Button>

      <div className={a.head}>
        <h1 className={a.title}>
          {shop.data ? t('admin.products.titleFor', { name: shop.data.name }) : t('admin.products.title')}
        </h1>
        <Button iconLeft={<PlusIcon size={20} />} onClick={() => setEditing('new')} disabled={loading}>
          {t('admin.products.add')}
        </Button>
      </div>

      <div className={a.filters}>
        <Input
          className={a.filterWide}
          label={t('admin.common.search')}
          type="search"
          placeholder={t('admin.products.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className={a.muted} style={{ marginBottom: 'var(--space-2)' }}>
        {products.data ? t('admin.common.results', { count: rows.length }) : ''}
      </p>

      {loading ? (
        <SkeletonList count={5} />
      ) : products.error && !products.data ? (
        <ErrorState error={products.error} onRetry={products.reload} />
      ) : !rows.length ? (
        <EmptyState icon={<BagIcon size={36} />} title={t('admin.products.emptyTitle')} message={t('admin.products.emptyMessage')} />
      ) : (
        <DataTable caption={t('admin.products.title')} columns={columns} rows={rows} rowClassName={(x) => (x.inStock ? '' : a.dim)} />
      )}

      <ProductFormDrawer
        open={Boolean(editing)}
        shopId={shopId}
        product={editing === 'new' ? null : editing}
        sections={sections}
        onClose={() => setEditing(null)}
        onSaved={() => products.reload()}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={t('admin.products.deleteTitle')}
        message={t('admin.products.deleteBody', { name: confirmDelete?.name || '' })}
        confirmLabel={t('admin.common.delete')}
        tone="danger"
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  );
}
