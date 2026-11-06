import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useCart } from '../../context/CartContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useAddToCart } from '../../hooks/useAddToCart.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useStagger } from '../../hooks/useStagger.js';
import { prefersMotion } from '../../utils/motion.js';
import { getShopById } from '../../services/shopService.js';
import { getProductsByShop } from '../../services/productService.js';
import { Badge, Button, EmptyState, ErrorState, Skeleton, SkeletonList, SmartImage } from '../../components/ui/index.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ProductCard from '../../components/customer/ProductCard.jsx';
import ProductDetailSheet from '../../components/customer/ProductDetailSheet.jsx';
import CartBar from '../../components/customer/CartBar.jsx';
import { AlertIcon, CategoryIcon, ClockIcon, LocationIcon, PhoneIcon, SearchIcon } from '../../components/icons/Icons.jsx';
import { formatClock } from '../../utils/format.js';
import { telLink } from '../../utils/links.js';
import p from '../../styles/page.module.css';
import s from './ShopPage.module.css';
import { NoShopsArt, NothingFoundArt } from '../../components/illustrations/Illustrations.jsx';

/** Groups products by `section`, keeping the order they first appear in. */
function groupBySection(products) {
  const groups = new Map();
  for (const prod of products) {
    if (!groups.has(prod.section)) groups.set(prod.section, []);
    groups.get(prod.section).push(prod);
  }
  return [...groups.entries()];
}

const slug = (section) => `sec-${String(section || 'other').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/** One section of the menu; its rows come in with a stagger. */
function MenuSection({ section, count, children }) {
  const ref = useStagger();
  return (
    <section id={slug(section)} className={s.group} aria-labelledby={`${slug(section)}-title`}>
      <h2 id={`${slug(section)}-title`} className={s.groupTitle}>
        {section} <span className={s.groupCount}>{count}</span>
      </h2>
      <div ref={ref} data-stagger>
        {children}
      </div>
    </section>
  );
}

/**
 * The hero photo collapses as the page scrolls: it drifts up at half speed
 * and fades, and the header turns solid once it has gone. Transform and
 * opacity only, written straight to the element once per frame.
 */
function useCollapsingHero() {
  const hero = useRef(null);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    let frame = 0;
    const motion = prefersMotion();
    const update = () => {
      frame = 0;
      const el = hero.current;
      const h = el?.offsetHeight || 220;
      const y = window.scrollY;
      if (el && motion) {
        const k = Math.min(1, Math.max(0, y / h));
        el.style.transform = `translateY(${y * 0.45}px)`;
        el.style.opacity = String(1 - k * 0.85);
      }
      setSolid(y > h - 72);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return { hero, solid };
}

/** Sticky section tabs: the one in view is marked; tapping one scrolls to it. */
function SectionTabs({ sections }) {
  const [active, setActive] = useState(sections[0]);
  const bar = useRef(null);

  // The active section is the last one whose heading has reached the line
  // under the header and the tabs. Checked once per frame while scrolling.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (bar.current?.getBoundingClientRect().bottom || 120) + 16;
      let current = sections[0];
      for (const sec of sections) {
        const el = document.getElementById(slug(sec));
        if (el && el.getBoundingClientRect().top <= line) current = sec;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sections]);

  // Keep the active tab in view inside the scrolling bar.
  useEffect(() => {
    const tab = bar.current?.querySelector('[aria-current="true"]');
    tab?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: prefersMotion() ? 'smooth' : 'auto' });
  }, [active]);

  const go = (sec) => {
    setActive(sec);
    document.getElementById(slug(sec))?.scrollIntoView({ behavior: prefersMotion() ? 'smooth' : 'auto', block: 'start' });
  };

  if (sections.length < 2) return null;
  return (
    <nav ref={bar} className={s.tabs} aria-label={t('shopPage.sectionsLabel')}>
      {sections.map((sec) => (
        <button key={sec} type="button" className={`${s.tab} ${sec === active ? s.tabActive : ''}`} aria-current={sec === active || undefined} onClick={() => go(sec)}>
          {sec}
        </button>
      ))}
    </nav>
  );
}

/** Shop page: hero, info, timings, search in shop, section tabs, products grouped by section, cart bar. */
export default function ShopPage() {
  const { id } = useParams();
  const { getPlace } = useSettings();
  const cart = useCart();
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);   // the item whose sheet is open
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
  const { hero, solid } = useCollapsingHero();
  const sections = useMemo(() => groups.map(([section]) => section), [groups]);

  return (
    <>
      <PageHeader
        overlay
        solid={solid}
        title={shop?.name || ''}
        right={
          shop && (
            <Button as="a" href={telLink(shop.phone)} variant="ghost" aria-label={t('shopPage.call')} iconLeft={<PhoneIcon size={20} />} />
          )
        }
      />

      <div className={s.heroWrap} aria-hidden="true">
        <div ref={hero} className={s.hero}>
          {shop ? (
            <SmartImage src={shop.image} alt="" ratio="16 / 10" rounded={false} fallback={<CategoryIcon category={shop.category} size={56} />} />
          ) : (
            <Skeleton height="100%" radius="0" className={s.heroSkeleton} />
          )}
        </div>
      </div>

      <main className={`${p.page} ${p.pageNoNav} ${s.main}`}>
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
                {[t(`categories.${shop.category}`), shop.address].filter(Boolean).join(' · ')}
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

            {data.products.length > 0 && !q && <SectionTabs sections={sections} />}

            {!data.products.length ? (
              <EmptyState icon={<NoShopsArt size={84} />} title={t('shopPage.noItemsTitle')} message={t('shopPage.emptyMenu')} />
            ) : !groups.length ? (
              <EmptyState icon={<NothingFoundArt size={84} />} title={t('shopPage.noItemsTitle')} message={t('shopPage.noItems')} />
            ) : (
              groups.map(([section, items]) => (
                <MenuSection key={section} section={section} count={items.length}>
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
                      onRemove={cart.removeItem}
                      onOpen={setDetail}
                    />
                  ))}
                </MenuSection>
              ))
            )}
          </>
        )}
      </main>

      <CartBar />
      {detail && (
        <ProductDetailSheet
          product={detail}
          category={shop?.category}
          qty={qtyFor(detail.id)}
          canOrder={shop?.isOpen}
          onClose={() => setDetail(null)}
          onAdd={(prod) => {
            addProduct(prod);
            setDetail(null);
          }}
          onIncrement={cart.increment}
          onDecrement={cart.decrement}
          onRemove={cart.removeItem}
        />
      )}
      {conflictSheet}
    </>
  );
}
