import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useCart } from '../../context/CartContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getShops } from '../../services/shopService.js';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/index.js';
import ShopCard from '../../components/customer/ShopCard.jsx';
import CategoryChips from '../../components/customer/CategoryChips.jsx';
import CartBar from '../../components/customer/CartBar.jsx';
import AddressPickerSheet from '../../components/customer/AddressPickerSheet.jsx';
import { CartIcon, ChevronDownIcon, LocationIcon, SearchIcon, StoreIcon } from '../../components/icons/Icons.jsx';
import p from '../../styles/page.module.css';
import s from './Home.module.css';

/** Customer home: address chip, search, category chips, shop list. */
export default function Home() {
  const [category, setCategory] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { itemCount } = useCart();
  const { selectedAddress } = useCustomer();
  const { getPlace } = useSettings();
  const shops = useAsync(() => getShops({ category }), [category]);

  const placeName = selectedAddress ? getPlace(selectedAddress.placeId)?.name : '';

  return (
    <>
      <header className={s.top}>
        <div className={s.topRow}>
          <button type="button" className={s.addressChip} onClick={() => setPickerOpen(true)}>
            <LocationIcon size={22} className={s.pin} />
            <span className={s.addressText}>
              <span className={s.deliveringTo}>{t('home.deliveringTo')}</span>
              <span className={s.addressLine}>
                {selectedAddress ? `${selectedAddress.street}, ${placeName}` : t('home.addAddress')}
              </span>
            </span>
            <ChevronDownIcon size={20} />
          </button>
          <Link to="/cart" className={s.cartBtn} aria-label={itemCount ? t('home.cartWithCount', { count: itemCount }) : t('home.cart')}>
            <CartIcon size={24} />
            {itemCount > 0 && <span className={s.cartCount} aria-hidden="true">{itemCount}</span>}
          </Link>
        </div>
        <Link to="/search" className={s.searchBar}>
          <SearchIcon size={20} />
          <span>{t('home.searchPlaceholder')}</span>
        </Link>
      </header>

      <main className={p.page}>
        <h1 className="visually-hidden">{t('app.name')}</h1>
        <CategoryChips value={category} onChange={setCategory} />

        <section className={p.section} aria-labelledby="shops-title">
          <div className={p.sectionHead}>
            <h2 id="shops-title" className={p.sectionTitle} style={{ margin: 0 }}>
              {t('home.shopsTitle')}
            </h2>
            {shops.data && !shops.loading && <span className={p.muted}>{t('home.shopsCount', { count: shops.data.length })}</span>}
          </div>

          {shops.loading ? (
            <SkeletonList count={5} />
          ) : shops.error ? (
            <ErrorState error={shops.error} onRetry={shops.reload} />
          ) : !shops.data?.length ? (
            <EmptyState icon={<StoreIcon size={36} />} title={t('home.noShopsTitle')} message={t('home.noShopsMessage')} />
          ) : (
            <ul className={p.list}>
              {shops.data.map((shop) => (
                <li key={shop.id}>
                  <ShopCard shop={shop} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <CartBar aboveNav />
      <AddressPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
