import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { searchAll } from '../../services/shopService.js';
import { EmptyState, ErrorState, PriceTag, SkeletonList, VegDot } from '../../components/ui/index.js';
import ShopCard from '../../components/customer/ShopCard.jsx';
import CartBar from '../../components/customer/CartBar.jsx';
import { ChevronRightIcon, CloseIcon, SearchIcon } from '../../components/icons/Icons.jsx';
import p from '../../styles/page.module.css';
import s from './Search.module.css';

const MIN_CHARS = 2;

/** Search shops and items. The query lives in the URL (?q=) so Back keeps it. */
export default function Search() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const debounced = useDebounce(query.trim(), 300);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!query) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useAsync(() => (debounced.length >= MIN_CHARS ? searchAll(debounced) : Promise.resolve(null)), [debounced]);

  const setQuery = (value) => setParams(value ? { q: value } : {}, { replace: true });
  const hasResults = results.data && (results.data.shops.length || results.data.products.length);

  return (
    <>
      <header className={s.header}>
        <div className={s.box}>
          <label htmlFor="search-input" className="visually-hidden">
            {t('search.label')}
          </label>
          <SearchIcon size={20} className={s.icon} />
          <input
            id="search-input"
            ref={inputRef}
            className={s.input}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className={s.clear} onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label={t('search.clear')}>
              <CloseIcon size={20} />
            </button>
          )}
        </div>
      </header>

      <main className={p.page} aria-live="polite">
        <h1 className="visually-hidden">{t('search.title')}</h1>
        {debounced.length < MIN_CHARS ? (
          <EmptyState icon={<SearchIcon size={36} />} title={t('search.title')} message={t('search.hint')} />
        ) : results.loading ? (
          <SkeletonList count={4} />
        ) : results.error ? (
          <ErrorState error={results.error} onRetry={results.reload} />
        ) : !hasResults ? (
          <EmptyState icon={<SearchIcon size={36} />} title={t('search.noResultsTitle')} message={t('search.noResults', { query: debounced })} />
        ) : (
          <>
            {results.data.shops.length > 0 && (
              <section aria-labelledby="res-shops">
                <h2 id="res-shops" className={p.sectionTitle}>{t('search.shops')}</h2>
                <ul className={p.list}>
                  {results.data.shops.map((shop) => (
                    <li key={shop.id}>
                      <ShopCard shop={shop} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {results.data.products.length > 0 && (
              <section className={p.section} aria-labelledby="res-items">
                <h2 id="res-items" className={p.sectionTitle}>{t('search.items')}</h2>
                <ul className={s.items}>
                  {results.data.products.map((item) => (
                    <li key={item.id}>
                      <Link to={`/shop/${item.shopId}`} className={`${s.item} ${!item.shopIsOpen || !item.inStock ? s.dim : ''}`}>
                        <VegDot isVeg={item.isVeg} />
                        <span className={s.itemText}>
                          <span className={s.itemName}>{item.name}</span>
                          <span className={p.muted}>{t('search.atShop', { shop: item.shopName })}</span>
                        </span>
                        <PriceTag amount={item.price} />
                        <ChevronRightIcon size={20} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      <CartBar aboveNav />
    </>
  );
}
