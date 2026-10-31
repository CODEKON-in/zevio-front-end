import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getShopById } from '../../services/shopService.js';
import { placeOrder } from '../../services/orderService.js';
import { Button, Card, ErrorState, Skeleton } from '../../components/ui/index.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import BillDetails from '../../components/customer/BillDetails.jsx';
import AddressSummary from '../../components/customer/AddressSummary.jsx';
import { CheckIcon } from '../../components/icons/Icons.jsx';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { formatPrice } from '../../utils/format.js';
import { upiLink } from '../../utils/links.js';
import p from '../../styles/page.module.css';
import s from './Checkout.module.css';

/**
 * Checkout: choose UPI or Cash on Delivery, then place the order.
 * UPI is two payments: item amount → shop's UPI ID, delivery fee → platform UPI ID.
 * UPI cannot be verified without a payment gateway, so the customer taps "I have paid".
 */
export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useCart();
  const { selectedAddress, customer, loading: customerLoading } = useCustomer();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [method, setMethod] = useState(PAYMENT_METHODS.COD);
  const [paidShop, setPaidShop] = useState(false);
  const [paidFee, setPaidFee] = useState(false);
  const [placing, setPlacing] = useState(false);

  const shop = useAsync(() => (cart.cart.shopId ? getShopById(cart.cart.shopId) : Promise.resolve(null)), [cart.cart.shopId]);

  // Page refreshed: wait for saved addresses before deciding anything.
  if (!customer && customerLoading) {
    return (
      <>
        <PageHeader title={t('checkout.title')} backTo="/cart" />
        <main className={`${p.page} ${p.pageNoNav}`}>
          <Skeleton height={220} radius="var(--radius-lg)" />
        </main>
      </>
    );
  }

  // Nothing to pay for → back to cart (also covers refresh after ordering).
  if (!cart.itemCount || !selectedAddress) {
    if (!placing) return <Navigate to="/cart" replace />;
  }

  const deliveryFee = settings.deliveryFee;
  const total = cart.itemTotal + deliveryFee;
  const upiReady = paidShop && paidFee;
  const canPlace = shop.data?.isOpen && (method === PAYMENT_METHODS.COD || upiReady);

  const submit = async () => {
    setPlacing(true);
    try {
      const order = await placeOrder({
        customer: { id: user.customerId, name: user.name, phone: user.phone },
        cart: {
          shopId: cart.cart.shopId,
          items: cart.cart.items.map((i) => ({ productId: i.productId, qty: i.qty })),
          instructions: cart.cart.instructions,
        },
        address: selectedAddress,
        paymentMethod: method,
      });
      cart.clearCart();
      cart.setInstructions('');
      navigate(`/orders/${order.id}/placed`, { replace: true });
    } catch (e) {
      setPlacing(false);
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    }
  };

  const orderNote = `${t('app.name')} - ${cart.cart.shopName}`;

  return (
    <>
      <PageHeader title={t('checkout.title')} backTo="/cart" />
      <main className={`${p.page} ${p.pageNoNav}`}>
        <Card>
          <h2 className={s.title}>{t('checkout.summary')}</h2>
          <p className={s.shop}>
            {cart.cart.shopName} · {t('common.itemsCount', { count: cart.itemCount })}
          </p>
          <div className={s.address}>
            <AddressSummary address={selectedAddress} />
          </div>
          <BillDetails itemTotal={cart.itemTotal} deliveryFee={deliveryFee} />
        </Card>

        <fieldset className={s.methods}>
          <legend className={s.title}>{t('checkout.payWith')}</legend>
          {[
            { value: PAYMENT_METHODS.UPI, label: t('checkout.upi'), hint: t('checkout.upiHint') },
            { value: PAYMENT_METHODS.COD, label: t('checkout.cod'), hint: t('checkout.codHint') },
          ].map((opt) => (
            <label key={opt.value} className={`${s.method} ${method === opt.value ? s.methodActive : ''}`}>
              <input
                type="radio"
                name="payment"
                value={opt.value}
                checked={method === opt.value}
                onChange={() => setMethod(opt.value)}
                className={s.radio}
              />
              <span className={s.methodText}>
                <span className={s.methodLabel}>{opt.label}</span>
                <span className={p.muted}>{opt.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {method === PAYMENT_METHODS.UPI && (
          <Card className={s.upi}>
            <h2 className={s.title}>{t('checkout.upiStepsTitle')}</h2>
            <p className={p.muted}>{t('checkout.upiStepsIntro', { platform: settings.platformUpiName })}</p>

            {shop.loading ? (
              <Skeleton height={120} radius="var(--radius-md)" />
            ) : shop.error ? (
              <ErrorState error={shop.error} onRetry={shop.reload} />
            ) : (
              <>
                <UpiStep
                  title={t('checkout.step1', { amount: formatPrice(cart.itemTotal), shop: shop.data.name })}
                  upiId={shop.data.upiId}
                  href={upiLink({ upiId: shop.data.upiId, name: shop.data.name, amount: cart.itemTotal, note: orderNote })}
                  paid={paidShop}
                  onPaid={() => setPaidShop(true)}
                />
                <UpiStep
                  title={t('checkout.step2', { amount: formatPrice(deliveryFee) })}
                  upiId={settings.platformUpiId}
                  href={upiLink({ upiId: settings.platformUpiId, name: settings.platformUpiName, amount: deliveryFee, note: orderNote })}
                  paid={paidFee}
                  disabled={!paidShop}
                  onPaid={() => setPaidFee(true)}
                />
                <p className={p.muted}>{t('checkout.upiNote')}</p>
              </>
            )}
          </Card>
        )}
      </main>

      <div className={p.footerBar}>
        <div className={p.footerInner}>
          <Button size="lg" variant="success" block disabled={!canPlace} loading={placing} onClick={submit}>
            {placing ? t('checkout.placing') : t('checkout.placeOrder', { total: formatPrice(total) })}
          </Button>
        </div>
      </div>
    </>
  );
}

/** One UPI payment step: open the UPI app, then confirm "I have paid". */
function UpiStep({ title, upiId, href, paid, disabled = false, onPaid }) {
  return (
    <div className={`${s.step} ${paid ? s.stepDone : ''} ${disabled ? s.stepDisabled : ''}`}>
      <div className={s.stepHead}>
        <h3 className={s.stepTitle}>{title}</h3>
        {paid && (
          <span className={s.paid}>
            <CheckIcon size={16} strokeWidth={3} />
            {t('checkout.paid')}
          </span>
        )}
      </div>
      <p className={s.upiId}>{t('checkout.upiId', { id: upiId })}</p>
      {!paid && (
        <div className={s.stepActions}>
          <Button as="a" href={disabled ? undefined : href} variant="primary" disabled={disabled}>
            {t('checkout.openUpi')}
          </Button>
          <Button variant="outline" disabled={disabled} onClick={onPaid}>
            {t('checkout.iHavePaid')}
          </Button>
        </div>
      )}
    </div>
  );
}

