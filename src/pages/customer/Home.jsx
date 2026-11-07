import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useLocationStatus } from '../../context/LocationContext.jsx';
import { useReopenAddressForm } from '../../hooks/useAddressReturn.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useStagger } from '../../hooks/useStagger.js';
import { getShops } from '../../services/shopService.js';
import { Button, EmptyState, ErrorState, SkeletonList } from '../../components/ui/index.js';
import ShopCard from '../../components/customer/ShopCard.jsx';
import MyntLogo from '../../components/brand/MyntLogo.jsx';
import CategoryChips from '../../components/customer/CategoryChips.jsx';
import CartBar from '../../components/customer/CartBar.jsx';
import AddressPickerSheet from '../../components/customer/AddressPickerSheet.jsx';
import { CartIcon, ChevronDownIcon, LocationIcon, PlusIcon, SearchIcon } from '../../components/icons/Icons.jsx';
import p from '../../styles/page.module.css';
import s from './Home.module.css';
import { NoShopsArt } from '../../components/illustrations/Illustrations.jsx';

/** Customer home: address chip, search, category chips, shop list. */
export default function Home() {
  const [category, setCategory] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { itemCount } = useCart();
  const { user } = useAuth();
  const firstName = (user?.name || '').trim().split(/\s+/)[0];
  const listRef = useStagger();
  const { selectedAddress, addresses, loading: addressesLoading } = useCustomer();
  const { isOutOfRange } = useLocationStatus();
  // No address yet (they skipped it): a gentle nudge, never a blocker. Not for
  // out-of-range customers — their own address is not where orders go.
  const showNudge = !isOutOfRange && !addressesLoading && !addresses.length;
  // Back from "Re-detect location": open the address form again.
  const [reopen, reopened] = useReopenAddressForm();
  useEffect(() => {
    if (reopen) {
      setPickerOpen(true);
      reopened();
    }
  }, [reopen, reopened]);
  const { getPlace } = useSettings();
  const shops = useAsync(() => getShops({ category }), [category]);

  const placeName = selectedAddress ? getPlace(selectedAddress.placeId)?.name : '';

  return (
    <>
      <header className={s.top}>
        <div className={s.band}>
          <div className={s.topRow}>
            <MyntLogo size={22} variant="onMango" className={s.logo} />
            <Link to="/cart" className={s.cartBtn} aria-label={itemCount ? t('home.cartWithCount', { count: itemCount }) : t('home.cart')}>
              <CartIcon size={24} />
              {itemCount > 0 && (
                <span className={s.cartCount} aria-hidden="true">
                  <span key={itemCount} className={s.cartCountNum}>
                    {itemCount}
                  </span>
                </span>
              )}
            </Link>
          </div>
          <div className={s.hello}>
            <h1 className={s.greeting}>{firstName ? t('home.greeting', { name: firstName }) : t('home.greetingNoName')}</h1>
            <p className={s.greetingSub}>{t('home.greetingSub')}</p>
          </div>
          <button type="button" className={s.addressChip} onClick={() => setPickerOpen(true)}>
            <LocationIcon size={18} className={s.pin} />
            <span className={s.addressText}>
              <span className="visually-hidden">{t('home.deliveringTo')} </span>
              <span className={s.addressLine}>
                {selectedAddress ? `${selectedAddress.street}, ${placeName}` : t('home.addAddress')}
              </span>
            </span>
            <ChevronDownIcon size={18} />
          </button>
        </div>
        <Link to="/search" className={s.searchBar}>
          <SearchIcon size={20} />
          <span>{t('home.searchPlaceholder')}</span>
        </Link>
      </header>

      <main className={p.page}>
        {showNudge && (
          <div className={s.nudge}>
            <span className={s.nudgeIcon} aria-hidden="true">
              <LocationIcon size={20} />
            </span>
            <p className={s.nudgeText}>{t('address.nudgeTitle')}</p>
            <Button size="sm" variant="secondary" iconLeft={<PlusIcon size={16} />} onClick={() => setPickerOpen(true)}>
              {t('address.nudgeAction')}
            </Button>
          </div>
        )}
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
            <EmptyState icon={<NoShopsArt size={84} />} title={t('home.noShopsTitle')} message={t('home.noShopsMessage')} />
          ) : (
            <ul ref={listRef} className={p.list} data-stagger>
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
      {/* From Home the form is a nudge, so it offers "Skip for now". */}
      <AddressPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} allowSkip />
    </>
  );
}
