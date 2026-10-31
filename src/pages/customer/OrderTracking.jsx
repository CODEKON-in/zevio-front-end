import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { cancelOrder, getOrderById } from '../../services/orderService.js';
import { getPartnerById } from '../../services/userService.js';
import {
  Badge, Button, Card, ConfirmDialog, ErrorState, PriceTag, Skeleton, SkeletonList, StatusTimeline, VegDot, statusTone,
} from '../../components/ui/index.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import BillDetails from '../../components/customer/BillDetails.jsx';
import AddressSummary from '../../components/customer/AddressSummary.jsx';
import { BikeIcon, PhoneIcon, StoreIcon } from '../../components/icons/Icons.jsx';
import { ACTIVE_STATUSES, ORDER_STATUS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';
import { telLink } from '../../utils/links.js';
import p from '../../styles/page.module.css';
import s from './OrderTracking.module.css';

const POLL_MS = 15000; // refresh status in the background

/** Order tracking + order details. */
export default function OrderTracking() {
  const { id } = useParams();
  const { showToast } = useToast();
  const order = useAsync(() => getOrderById(id), [id]);
  const o = order.data;
  const partner = useAsync(() => (o?.partnerId ? getPartnerById(o.partnerId) : Promise.resolve(null)), [o?.partnerId]);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Off by default with the real API, so testing never moves real orders by itself.

  const active = o && ACTIVE_STATUSES.includes(o.status);

  // Background refresh while the order is still moving.
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(order.reload, POLL_MS);
    return () => clearInterval(timer);
  }, [active, order.reload]);

  const doCancel = async () => {
    try {
      await cancelOrder(id);
      showToast(t('tracking.cancelled'), { type: 'success' });
      setConfirmCancel(false);
      order.reload();
    } catch (e) {
      setConfirmCancel(false);
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
      order.reload();
    }
  };

  return (
    <>
      <PageHeader title={o ? t('tracking.title', { number: o.number }) : ''} backTo="/orders" />
      <main className={`${p.page} ${p.pageNoNav}`}>
        {order.loading && !o ? (
          <>
            <Skeleton height={80} radius="var(--radius-lg)" />
            <div style={{ height: 16 }} />
            <SkeletonList count={3} />
          </>
        ) : order.error && !o ? (
          <ErrorState error={order.error} onRetry={order.reload} />
        ) : (
          <>
            <Card className={s.statusCard}>
              <div className={p.between}>
                <div>
                  <p className={p.muted}>{t('tracking.placedAt', { date: formatDateTime(o.createdAt) })}</p>
                  <h1 className={s.shop}>{o.shopName}</h1>
                </div>
                <Badge tone={statusTone(o.status)} solid>{t(`orderStatus.${o.status}`)}</Badge>
              </div>
              {o.status === ORDER_STATUS.DELIVERED && <p className={s.delivered}>{t('tracking.deliveredTitle')}</p>}
            </Card>

            <Card className={s.block}>
              <h2 className={s.blockTitle}>{t('timeline.title')}</h2>
              <StatusTimeline
                status={o.status}
                history={o.statusHistory}
                extra={o.rejectReason ? t('tracking.rejectedReason', { reason: t(`rejectReasons.${o.rejectReason}`) }) : null}
              />
            </Card>

            <div className={s.callRow}>
              <Button as="a" href={telLink(o.shopPhone)} variant="outline" iconLeft={<StoreIcon size={20} />}>
                {t('tracking.callShop')}
              </Button>
              {partner.data ? (
                <Button as="a" href={telLink(partner.data.phone)} variant="outline" iconLeft={<PhoneIcon size={20} />}>
                  {t('tracking.callPartner')}
                </Button>
              ) : null}
            </div>
            {active && (
              <p className={s.partner}>
                <BikeIcon size={20} />
                {partner.data ? t('tracking.partner', { name: partner.data.name }) : t('tracking.noPartner')}
              </p>
            )}

            <Card className={s.block}>
              <h2 className={s.blockTitle}>{t('tracking.items')}</h2>
              <ul className={s.items}>
                {o.items.map((item) => (
                  <li key={item.productId} className={s.item}>
                    <VegDot isVeg={item.isVeg} />
                    <span className={s.itemName}>
                      {item.name} × {item.qty}
                    </span>
                    <PriceTag amount={item.price * item.qty} muted />
                  </li>
                ))}
              </ul>
              <BillDetails itemTotal={o.itemTotal} deliveryFee={o.deliveryFee} />
              <p className={s.payment}>
                {t('tracking.payment')}: <strong>{t(`payment.${o.paymentMethod}`)}</strong> ·{' '}
                <Badge tone={o.paymentStatus === 'PAID' ? 'success' : 'warning'} size="sm">
                  {t(`payment.${o.paymentStatus}`)}
                </Badge>
              </p>
            </Card>

            <Card className={s.block}>
              <h2 className={s.blockTitle}>{t('tracking.deliverTo')}</h2>
              <AddressSummary address={o.address} />
              {o.instructions && (
                <p className={s.instructions}>
                  <strong>{t('tracking.instructions')}:</strong> {o.instructions}
                </p>
              )}
            </Card>
          </>
        )}
      </main>

      {o?.status === ORDER_STATUS.PENDING && (
        <div className={p.footerBar}>
          <div className={p.footerInner}>
            <Button variant="outline" block onClick={() => setConfirmCancel(true)} className={s.cancelBtn}>
              {t('tracking.cancel')}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title={t('tracking.cancelTitle')}
        message={t('tracking.cancelBody')}
        confirmLabel={t('tracking.cancelConfirm')}
        cancelLabel={t('tracking.keep')}
        tone="danger"
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
      />
    </>
  );
}
