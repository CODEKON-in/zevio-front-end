import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useShopPanel } from '../../context/ShopPanelContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getProductsByShop, setProductStock } from '../../services/productService.js';
import { Button, EmptyState, ErrorState, PriceTag, SkeletonList, SmartImage, Toggle, VegDot } from '../../components/ui/index.js';
import { BoxIcon, CategoryIcon, EditIcon, PlusIcon, SearchIcon } from '../../components/icons/Icons.jsx';
import p from '../../styles/page.module.css';
import s from './Products.module.css';

/** Shop products: search, quick in-stock switch per row, add / edit. */
export default function Products() {
  const { user } = useAuth();
  const { shop } = useShopPanel();
  const { showToast } = useToast();
  const products = useAsync(() => getProductsByShop(user.shopId), [user.shopId]);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () => (products.data || []).filter((prod) => !q || prod.name.toLowerCase().includes(q) || prod.section.toLowerCase().includes(q)),
    [products.data, q],
  );
  const outCount = (products.data || []).filter((prod) => !prod.inStock).length;

  // Optimistic: flip at once, undo if the save fails.
  const toggleStock = async (prod, inStock) => {
    setBusyId(prod.id);
    products.setData((list0) => list0.map((x) => (x.id === prod.id ? { ...x, inStock } : x)));
    try {
      await setProductStock(prod.id, inStock);
      showToast(inStock ? t('shopPanel.products.nowInStock', { name: prod.name }) : t('shopPanel.products.nowOutOfStock', { name: prod.name }), {
        type: inStock ? 'success' : 'info',
      });
    } catch (e) {
      products.setData((list0) => list0.map((x) => (x.id === prod.id ? { ...x, inStock: !inStock } : x)));
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className={p.page}>
      <div className={p.between} style={{ marginBottom: 'var(--space-3)' }}>
        <div>
          <h1>{t('shopPanel.products.title')}</h1>
          {products.data && (
            <p className={p.muted}>
              {t('shopPanel.products.count', { count: products.data.length })}
              {outCount > 0 && ` · ${t('shopPanel.products.outCount', { count: outCount })}`}
            </p>
          )}
        </div>
        <Button as={Link} to="/shop-panel/products/new" iconLeft={<PlusIcon size={20} />}>
          {t('shopPanel.products.add')}
        </Button>
      </div>

      <div className={s.searchBox}>
        <label htmlFor="product-search" className="visually-hidden">
          {t('shopPanel.products.searchLabel')}
        </label>
        <SearchIcon size={20} className={s.searchIcon} />
        <input
          id="product-search"
          type="search"
          className={s.searchInput}
          placeholder={t('shopPanel.products.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {products.loading && !products.data ? (
        <SkeletonList count={5} />
      ) : products.error && !products.data ? (
        <ErrorState error={products.error} onRetry={products.reload} />
      ) : !products.data.length ? (
        <EmptyState
          icon={<BoxIcon size={36} />}
          title={t('shopPanel.products.emptyTitle')}
          message={t('shopPanel.products.emptyMessage')}
          action={
            <Button as={Link} to="/shop-panel/products/new" iconLeft={<PlusIcon size={20} />}>
              {t('shopPanel.products.add')}
            </Button>
          }
        />
      ) : !list.length ? (
        <EmptyState icon={<SearchIcon size={36} />} title={t('search.noResultsTitle')} message={t('shopPanel.products.noMatch', { query })} />
      ) : (
        <ul className={s.list}>
          {list.map((prod) => (
            <li key={prod.id} className={`${s.row} ${prod.inStock ? '' : s.out}`}>
              <SmartImage src={prod.image} alt="" ratio="1 / 1" className={s.thumb} fallback={<CategoryIcon category={shop?.category} size={22} />} />
              <div className={s.info}>
                <div className={s.nameRow}>
                  <VegDot isVeg={prod.isVeg} size={14} />
                  <span className={s.name}>{prod.name}</span>
                </div>
                <span className={p.muted}>
                  <PriceTag amount={prod.price} size="sm" /> · {prod.section}
                </span>
                <Toggle
                  className={s.stock}
                  label={t('shopPanel.products.inStock')}
                  ariaLabel={t('shopPanel.products.stockAria', { name: prod.name })}
                  checked={prod.inStock}
                  loading={busyId === prod.id}
                  onChange={(next) => toggleStock(prod, next)}
                />
              </div>
              <Button
                as={Link}
                to={`/shop-panel/products/${prod.id}`}
                variant="ghost"
                aria-label={t('shopPanel.products.edit', { name: prod.name })}
                iconLeft={<EditIcon size={20} />}
                className={s.edit}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
