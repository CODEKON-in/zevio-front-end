import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getOrderById, updateOrderStatus } from '../../services/orderService.js';
import { getShopById } from '../../services/shopService.js';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Skeleton, SkeletonList, VegDot, statusTone } from '../../components/ui/index.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { AlertIcon, CheckIcon, LocationIcon, PhoneIcon, StoreIcon } from '../../components/icons/Icons.jsx';
import { ORDER_STATUS } from '../../utils/constants.js';
import { formatPrice } from '../../utils/format.js';
import { telLink } from '../../utils/links.js';
import { cashToCollect } from '../../utils/orders.js';
import p from '../../styles/page.module.css';
import s from './DeliveryOrderDetail.module.css';

/** Delivery order detail: PICKUP and DROP blocks, cash to collect, Picked up → Delivered (with confirm). */
export default function DeliveryOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { reloadOrders } = useDelivery();
  const { getPlace } = useSettings();
  const { showToast } = useToast();
  const order = useAsync(() => getOrderById(id), [id]);
  const o = order.data;
  const shop = useAsync(() => (o?.shopId ? getShopById(o.shopId) : Promise.resolve(null)), [o?.shopId]);
  const [confirm, setConfirm] = useState(null); // 'pickup' | 'deliver' | null

  const cash = o ? cashToCollect(o) : 0;
  const count = o ? o.items.reduce((n, i) => n + i.qty, 0) : 0;

  const move = async () => {
    const next = confirm === 'pickup' ? ORDER_STATUS.OUT_FOR_DELIVERY : ORDER_STATUS.DELIVERED;
    try {
      await updateOrderStatus(id, next);
      showToast(next === ORDER_STATUS.OUT_FOR_DELIVERY ? t('delivery.order.pickedToast') : t('delivery.order.deliveredToast'), { type: 'success' });
      setConfirm(null);
      await order.reload();
      reloadOrders();
    } catch (e) {
      setConfirm(null);
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
      order.reload();
    }
  };

  const notMine = o && o.partnerId !== user.partnerId;

  return (
    <>
      <PageHeader
        title={o ? t('delivery.order.title', { number: o.number }) : ''}
        backTo="/delivery"
        right={o && <Badge tone={statusTone(o.status)} solid>{t(`orderStatus.${o.status}`)}</Badge>}
      />
      <main className={`${p.page} ${p.pageNoNav}`}>
        {order.loading && !o ? (
          <>
            <Skeleton height={120} radius="var(--radius-lg)" />
            <div style={{ height: 12 }} />
            <SkeletonList count={2} />
          </>
        ) : order.error && !o ? (
          <ErrorState error={order.error} onRetry={order.reload} />
        ) : notMine ? (
          <EmptyState icon={<AlertIcon size={36} />} title={t('delivery.order.notYours')} />
        ) : (
          <>
            {/* Money first: the most important thing to get right. */}
            {cash > 0 ? (
              <section className={`${s.money} ${s.cod}`} aria-labelledby="money-title">
                <h2 id="money-title" className={s.moneyTitle}>{t('delivery.order.collectTitle')}</h2>
                <p className={s.moneyAmount}>{t('delivery.order.collect', { amount: formatPrice(cash) })}</p>
                <p className={s.moneyHint}>
                  {t('delivery.order.collectHint', { items: formatPrice(o.itemTotal), fee: formatPrice(o.deliveryFee) })}
                </p>
              </section>
            ) : (
              <section className={`${s.money} ${s.paid}`} aria-labelledby="money-title">
                <h2 id="money-title" className={s.moneyTitle}>
                  <CheckIcon size={20} strokeWidth={3} /> {t('delivery.order.paidTitle')}
                </h2>
                <p className={s.moneyHint}>{t('delivery.order.paidHint')}</p>
              </section>
            )}

            <Card className={`${s.stop} ${o.status === ORDER_STATUS.PREPARING || o.status === ORDER_STATUS.CONFIRMED ? s.current : ''}`}>
              <h2 className={s.stopTitle}>
                <span className={`${s.stopIcon} ${s.pickup}`}><StoreIcon size={18} /></span>
                {t('delivery.order.pickup')}
              </h2>
              <p className={s.name}>{o.shopName}</p>
              <p className={p.muted}>
                {shop.data?.address ? `${shop.data.address}, ` : ''}
                {getPlace(o.shopPlaceId)?.name}
              </p>
              <Button as="a" href={telLink(o.shopPhone)} variant="outline" iconLeft={<PhoneIcon size={20} />} className={s.call}>
                {t('delivery.order.callShop')}
              </Button>
            </Card>

            <Card className={`${s.stop} ${o.status === ORDER_STATUS.OUT_FOR_DELIVERY ? s.current : ''}`}>
              <h2 className={s.stopTitle}>
                <span className={`${s.stopIcon} ${s.drop}`}><LocationIcon size={18} /></span>
                {t('delivery.order.drop')}
              </h2>
              <p className={s.name}>{o.address.name || o.customerName}</p>
              <p>
                {o.address.street}, <strong>{getPlace(o.address.placeId)?.name}</strong>
              </p>
              {o.address.landmark && (
                <p className={s.landmark}>
                  <span className={s.landmarkLabel}>{t('delivery.order.landmark')}:</span> {o.address.landmark}
                </p>
              )}
              {o.address.notes && (
                <p className={p.muted}>
                  {t('delivery.order.notes')}: {o.address.notes}
                </p>
              )}
              <Button as="a" href={telLink(o.address.phone || o.customerPhone)} variant="outline" iconLeft={<PhoneIcon size={20} />} className={s.call}>
                {t('delivery.order.callCustomer')}
              </Button>
            </Card>

            <Card className={s.stop}>
              <h2 className={s.stopTitle}>{t('delivery.order.items', { count })}</h2>
              <ul className={s.items}>
                {o.items.map((i) => (
                  <li key={i.productId}>
                    <span className={s.qty}>{i.qty} ×</span>
                    <VegDot isVeg={i.isVeg} size={14} />
                    {i.name}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </main>

      {o && !notMine && (
        <div className={p.footerBar}>
          <div className={p.footerInner}>
            {o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.PENDING ? (
              <p className={s.wait}>{t('delivery.order.preparing')}</p>
            ) : o.status === ORDER_STATUS.PREPARING ? (
              <Button size="lg" block onClick={() => setConfirm('pickup')}>
                {t('delivery.order.pickedUp')}
              </Button>
            ) : o.status === ORDER_STATUS.OUT_FOR_DELIVERY ? (
              <Button size="lg" variant="success" block onClick={() => setConfirm('deliver')}>
                {t('delivery.order.delivered')}
              </Button>
            ) : (
              <p className={s.wait}>{t('delivery.order.done', { status: t(`orderStatus.${o.status}`).toLowerCase() })}</p>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'pickup'}
        title={t('delivery.order.confirmPickupTitle')}
        message={o ? t('delivery.order.confirmPickupBody', { count, shop: o.shopName }) : ''}
        confirmLabel={t('delivery.order.yesPicked')}
        onClose={() => setConfirm(null)}
        onConfirm={move}
      />
      <ConfirmDialog
        open={confirm === 'deliver'}
        title={t('delivery.order.confirmDeliverTitle')}
        message={
          o
            ? cash > 0
              ? t('delivery.order.confirmDeliverBodyCod', { name: o.customerName, amount: formatPrice(cash) })
              : t('delivery.order.confirmDeliverBodyPaid', { name: o.customerName })
            : ''
        }
        confirmLabel={t('delivery.order.yesDelivered')}
        tone="success"
        onClose={() => setConfirm(null)}
        onConfirm={move}
      />
    </>
  );
}
