import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useCart } from '../../context/CartContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useAddToCart } from '../../hooks/useAddToCart.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { getShopById } from '../../services/shopService.js';
import { getProductsByShop } from '../../services/productService.js';
import { Badge, Button, EmptyState, ErrorState, Skeleton, SkeletonList } from '../../components/ui/index.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ProductCard from '../../components/customer/ProductCard.jsx';
import CartBar from '../../components/customer/CartBar.jsx';
import { AlertIcon, ClockIcon, LocationIcon, PhoneIcon, SearchIcon } from '../../components/icons/Icons.jsx';
import { formatClock } from '../../utils/format.js';
import { telLink } from '../../utils/links.js';
import p from '../../styles/page.module.css';
import s from './ShopPage.module.css';

/** Groups products by `section`, keeping the order they first appear in. */
function groupBySection(products) {
  const groups = new Map();
  for (const prod of products) {
    if (!groups.has(prod.section)) groups.set(prod.section, []);
    groups.get(prod.section).push(prod);
  }
  return [...groups.entries()];
}

/** Shop page: info, timings, search in shop, products grouped by section, cart bar. */
export default function ShopPage() {
  const { id } = useParams();
  const { getPlace } = useSettings();
  const cart = useCart();
  const [query, setQuery] = useState('');
  const q = useDebounce(query.trim().toLowerCase(), 150);

  const { data, loading, error, reload } = useAsync(async () => {
    const [shop, products] = await Promise.all([getShopById(id), getProductsByShop(id)]);
    return { shop, products };
  }, [id]);

  const shop = data?.shop;
  const { addProduct, conflictSheet } = useAddToCart(shop);

  const groups = useMemo(() => {
    if (!data) return [];
    const list = q ? data.products.filter((prod) => prod.name.toLowerCase().includes(q)) : data.products;
    return groupBySection(list);
  }, [data, q]);

  // Cart quantities only for this shop.
  const qtyFor = (productId) => (cart.cart.shopId === id ? cart.getQty(productId) : 0);

  return (
    <>
      <PageHeader
        title={shop?.name || ''}
        right={
          shop && (
            <Button as="a" href={telLink(shop.phone)} variant="ghost" aria-label={t('shopPage.call')} iconLeft={<PhoneIcon size={22} />} />
          )
        }
      />

      <main className={`${p.page} ${p.pageNoNav}`}>
        {loading && !data ? (
          <>
            <div className={s.infoSkeleton}>
              <Skeleton width="65%" height={26} />
              <Skeleton width="45%" />
              <Skeleton width="55%" />
            </div>
            <SkeletonList count={4} />
          </>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <>
            <section className={s.info} aria-labelledby="shop-name">
              <div className={p.between}>
                <h1 id="shop-name" className={s.name}>{shop.name}</h1>
                <Badge tone={shop.isOpen ? 'success' : 'neutral'} solid>
                  {shop.isOpen ? t('common.open') : t('common.closed')}
                </Badge>
              </div>
              <p className={s.meta}>
                {t(`categories.${shop.category}`)} · {shop.address}
              </p>
              <p className={s.meta}>
                <span className={s.metaItem}>
                  <LocationIcon size={16} />
                  {getPlace(shop.placeId)?.name}
                </span>
                <span className={s.metaItem}>
                  <ClockIcon size={16} />
                  {t('shopPage.timings', { open: formatClock(shop.timings.open), close: formatClock(shop.timings.close) })}
                </span>
              </p>
              {shop.isOpen && (
                <p className={s.eta}>
                  <ClockIcon size={16} />
                  {t('common.minutes', { time: shop.deliveryTime })}
                </p>
              )}
            </section>

            {!shop.isOpen && (
              <div className={p.notice} role="status" style={{ marginTop: 'var(--space-3)' }}>
                <AlertIcon size={20} />
                <span>
                  {t('shopPage.closedTitle')}. {t('shopPage.closedMessage', { time: formatClock(shop.timings.open) })}
                </span>
              </div>
            )}

            {data.products.length > 0 && (
              <div className={s.searchBox}>
                <label htmlFor="shop-search" className="visually-hidden">
                  {t('shopPage.searchLabel')}
                </label>
                <SearchIcon size={20} className={s.searchIcon} />
                <input
                  id="shop-search"
                  type="search"
                  className={s.searchInput}
                  placeholder={t('shopPage.searchPlaceholder', { shop: shop.name })}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            )}

            {!data.products.length ? (
              <EmptyState title={t('shopPage.noItemsTitle')} message={t('shopPage.emptyMenu')} />
            ) : !groups.length ? (
              <EmptyState icon={<SearchIcon size={36} />} title={t('shopPage.noItemsTitle')} message={t('shopPage.noItems')} />
            ) : (
              groups.map(([section, items]) => (
                <section key={section} className={s.group} aria-labelledby={`sec-${section}`}>
                  <h2 id={`sec-${section}`} className={s.groupTitle}>
                    {section} <span className={p.muted}>({items.length})</span>
                  </h2>
                  {items.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      category={shop.category}
                      qty={qtyFor(prod.id)}
                      canOrder={shop.isOpen}
                      onAdd={addProduct}
                      onIncrement={cart.increment}
                      onDecrement={cart.decrement}
                    />
                  ))}
                </section>
              ))
            )}
          </>
        )}
      </main>

      <CartBar />
      {conflictSheet}
    </>
  );
}
