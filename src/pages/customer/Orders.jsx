import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { cancelOrder, getOrders } from '../../services/orderService.js';
import { getShopById } from '../../services/shopService.js';
import { getProductsByShop } from '../../services/productService.js';
import { Button, ConfirmDialog, EmptyState, ErrorState, SkeletonList } from '../../components/ui/index.js';
import OrderCard from '../../components/customer/OrderCard.jsx';
import { OrdersIcon } from '../../components/icons/Icons.jsx';
import { ACTIVE_STATUSES, ORDER_STATUS } from '../../utils/constants.js';
import { canCancelOrder } from '../../utils/orderRules.js';
import p from '../../styles/page.module.css';

/** Order history: active orders first, then past orders with Reorder. */
export default function Orders() {
  const { user } = useAuth();
  const cart = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const orders = useAsync(() => getOrders({ customerId: user.customerId }), [user.customerId]);
  const [reordering, setReordering] = useState(null);
  const [pendingReorder, setPendingReorder] = useState(null);
  const [pendingCancel, setPendingCancel] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const active = orders.data?.filter((o) => ACTIVE_STATUSES.includes(o.status)) || [];
  const past = orders.data?.filter((o) => !ACTIVE_STATUSES.includes(o.status)) || [];

  // Put the order's items back in the cart (only those still sold and in stock).
  const reorder = async (order) => {
    setPendingReorder(null);
    setReordering(order.id);
    try {
      const [shop, products] = await Promise.all([getShopById(order.shopId), getProductsByShop(order.shopId)]);
      const byId = Object.fromEntries(products.map((prod) => [prod.id, prod]));
      const lines = order.items
        .map((i) => ({ product: byId[i.productId], qty: i.qty }))
        .filter((l) => l.product && l.product.inStock);
      if (!lines.length) {
        showToast(t('orders.reorderNone'), { type: 'error' });
        return;
      }
      cart.loadItems(shop, lines);
      showToast(lines.length < order.items.length ? t('orders.reorderSome') : t('orders.reordered'), {
        type: lines.length < order.items.length ? 'info' : 'success',
      });
      navigate('/cart');
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setReordering(null);
    }
  };

  /** Cancel straight from the list, with the same rule the tracking page uses. */
  const doCancel = async () => {
    const order = pendingCancel;
    setPendingCancel(null);
    if (!order) return;
    // It may have gone out for delivery while the dialog was open.
    if (!canCancelOrder(order)) {
      showToast(t('tracking.cancelTooLate'), { type: 'error' });
      orders.reload();
      return;
    }
    setCancelling(order.id);
    orders.setData((list) => list.map((o) => (o.id === order.id ? { ...o, status: ORDER_STATUS.CANCELLED } : o)));
    try {
      const updated = await cancelOrder(order.id);
      orders.setData((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      showToast(t('tracking.cancelled'), { type: 'success' });
    } catch (e) {
      orders.setData((list) => list.map((o) => (o.id === order.id ? order : o)));
      showToast(e.code === 'NOT_CANCELLABLE' ? t('tracking.cancelTooLate') : t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
      orders.reload();
    } finally {
      setCancelling(null);
    }
  };

  const askReorder = (order) => {
    if (cart.itemCount) setPendingReorder(order);
    else reorder(order);
  };

  return (
    <main className={p.page}>
      <h1 style={{ marginBottom: 'var(--space-4)' }}>{t('orders.title')}</h1>

      {orders.loading && !orders.data ? (
        <SkeletonList count={4} />
      ) : orders.error ? (
        <ErrorState error={orders.error} onRetry={orders.reload} />
      ) : !orders.data.length ? (
        <EmptyState
          icon={<OrdersIcon size={36} />}
          title={t('orders.emptyTitle')}
          message={t('orders.emptyMessage')}
          action={
            <Button as={Link} to="/">
              {t('cart.browse')}
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <section aria-labelledby="active-orders">
              <h2 id="active-orders" className={p.sectionTitle}>{t('orders.active')}</h2>
              <ul className={p.list}>
                {active.map((o) => (
                  <OrderCard key={o.id} order={o} onCancel={setPendingCancel} cancelling={cancelling === o.id} />
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section className={active.length ? p.section : undefined} aria-labelledby="past-orders">
              <h2 id="past-orders" className={p.sectionTitle}>{t('orders.past')}</h2>
              <ul className={p.list}>
                {past.map((o) => (
                  <OrderCard key={o.id} order={o} onReorder={askReorder} reordering={reordering === o.id} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title={t('tracking.cancelTitle')}
        message={t('tracking.cancelBody')}
        confirmLabel={t('tracking.cancelConfirm')}
        cancelLabel={t('tracking.keep')}
        tone="danger"
        onClose={() => setPendingCancel(null)}
        onConfirm={doCancel}
      />

      <ConfirmDialog
        open={Boolean(pendingReorder)}
        title={t('orders.reorderTitle')}
        message={t('orders.reorderBody')}
        confirmLabel={t('orders.reorder')}
        onClose={() => setPendingReorder(null)}
        onConfirm={() => reorder(pendingReorder)}
      />
    </main>
  );
}
