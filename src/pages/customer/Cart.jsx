import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useCart } from '../../context/CartContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getShopById } from '../../services/shopService.js';
import { Button, Card, ConfirmDialog, EmptyState, Input, PriceTag, QuantityStepper, VegDot } from '../../components/ui/index.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import BillDetails from '../../components/customer/BillDetails.jsx';
import AddressSummary from '../../components/customer/AddressSummary.jsx';
import AddressPickerSheet from '../../components/customer/AddressPickerSheet.jsx';
import { AlertIcon, CartIcon, LocationIcon, PlusIcon, StoreIcon } from '../../components/icons/Icons.jsx';
import p from '../../styles/page.module.css';
import s from './Cart.module.css';

/** Cart: items with steppers, instructions, address, bill. One shop only. */
export default function Cart() {
  const navigate = useNavigate();
  const cart = useCart();
  const { selectedAddress } = useCustomer();
  const { settings } = useSettings();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Fresh shop info, so we can warn if it closed while items sat in the cart.
  const shop = useAsync(() => (cart.cart.shopId ? getShopById(cart.cart.shopId) : Promise.resolve(null)), [cart.cart.shopId]);
  const shopClosed = shop.data && !shop.data.isOpen;

  if (!cart.itemCount) {
    return (
      <>
        <PageHeader title={t('cart.title')} />
        <main className={p.page}>
          <EmptyState
            icon={<CartIcon size={36} />}
            title={t('cart.emptyTitle')}
            message={t('cart.emptyMessage')}
            action={
              <Button as={Link} to="/">
                {t('cart.browse')}
              </Button>
            }
          />
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('cart.title')} />
      <main className={`${p.page} ${p.pageNoNav}`}>
        <Card>
          <div className={p.between}>
            <h2 className={s.shopName}>
              <StoreIcon size={20} />
              {cart.cart.shopName}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
              {t('cart.clear')}
            </Button>
          </div>

          {shopClosed && (
            <div className={p.notice} role="status" style={{ marginTop: 'var(--space-3)' }}>
              <AlertIcon size={20} />
              <span>{t('cart.shopClosed', { shop: cart.cart.shopName })}</span>
            </div>
          )}

          <ul className={s.items}>
            {cart.cart.items.map((item) => (
              <li key={item.productId} className={s.item}>
                <VegDot isVeg={item.isVeg} />
                <div className={s.itemInfo}>
                  <span className={s.itemName}>{item.name}</span>
                  <PriceTag amount={item.price} size="sm" muted />
                </div>
                <QuantityStepper
                  value={item.qty}
                  itemName={item.name}
                  onIncrement={() => cart.increment(item.productId)}
                  onDecrement={() => cart.decrement(item.productId)}
                />
                <PriceTag amount={item.price * item.qty} className={s.lineTotal} />
              </li>
            ))}
          </ul>

          <Button as={Link} to={`/shop/${cart.cart.shopId}`} variant="ghost" iconLeft={<PlusIcon size={18} />}>
            {t('cart.addMore')}
          </Button>
        </Card>

        <Card className={s.block}>
          <Input
            label={`${t('cart.instructionsLabel')} (${t('common.optional')})`}
            placeholder={t('cart.instructionsPlaceholder')}
            multiline
            rows={2}
            maxLength={200}
            value={cart.cart.instructions}
            onChange={(e) => cart.setInstructions(e.target.value)}
          />
        </Card>

        <Card className={s.block}>
          <div className={p.between} style={{ marginBottom: 'var(--space-2)' }}>
            <h2 className={s.blockTitle}>
              <LocationIcon size={20} />
              {t('cart.deliverTo')}
            </h2>
            {selectedAddress && (
              <Button variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
                {t('cart.change')}
              </Button>
            )}
          </div>
          {selectedAddress ? (
            <AddressSummary address={selectedAddress} />
          ) : (
            <>
              <p className={p.muted}>{t('cart.noAddress')}</p>
              <Button variant="secondary" block iconLeft={<PlusIcon size={18} />} onClick={() => setPickerOpen(true)} style={{ marginTop: 'var(--space-3)' }}>
                {t('address.add')}
              </Button>
            </>
          )}
        </Card>

        <Card className={s.block}>
          <BillDetails title={t('cart.bill')} itemTotal={cart.itemTotal} deliveryFee={settings.deliveryFee} />
        </Card>
      </main>

      <div className={p.footerBar}>
        <div className={p.footerInner}>
          <Button
            size="lg"
            block
            disabled={!selectedAddress || shopClosed || shop.loading}
            onClick={() => navigate('/checkout')}
          >
            {t('cart.continue')} · <PriceTag amount={cart.itemTotal + settings.deliveryFee} />
          </Button>
        </div>
      </div>

      <AddressPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <ConfirmDialog
        open={confirmClear}
        title={t('cart.clearConfirmTitle')}
        message={t('cart.clearConfirmBody')}
        confirmLabel={t('cart.clear')}
        tone="danger"
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          cart.clearCart();
          setConfirmClear(false);
        }}
      />
    </>
  );
}
