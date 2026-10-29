import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useShopPanel } from '../../context/ShopPanelContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getOrderById, updateOrderStatus } from '../../services/orderService.js';
import { getPartnerById } from '../../services/userService.js';
import {
  Badge, BottomSheet, Button, Card, ErrorState, PriceTag, Skeleton, SkeletonList, StatusTimeline, VegDot, statusTone,
} from '../../components/ui/index.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { BikeIcon, CheckIcon, CloseIcon, PhoneIcon } from '../../components/icons/Icons.jsx';
import { ORDER_STATUS, PAYMENT_METHODS, REJECT_REASONS } from '../../utils/constants.js';
import { formatDateTime, formatPrice } from '../../utils/format.js';
import { telLink } from '../../utils/links.js';
import p from '../../styles/page.module.css';
import s from './ShopOrderDetail.module.css';

/** Shop order detail: items, customer, address, payment; Accept / Reject (with reason) / Mark as ready. */
export default function ShopOrderDetail() {
  const { id } = useParams();
  const { reloadOrders, markSeen } = useShopPanel();
  const { getPlace } = useSettings();
  const { showToast } = useToast();
  const order = useAsync(() => getOrderById(id), [id]);
  const o = order.data;
  const partner = useAsync(() => (o?.partnerId ? getPartnerById(o.partnerId) : Promise.resolve(null)), [o?.partnerId]);

  const [busy, setBusy] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    markSeen(id);
  }, [id, markSeen]);

  const move = async (status, extra) => {
    setBusy(status);
    try {
      await updateOrderStatus(id, status, extra);
      const msg = { CONFIRMED: 'accepted', CANCELLED: 'rejected', PREPARING: 'ready' }[status];
      showToast(t(`shopPanel.order.${msg}`), { type: status === ORDER_STATUS.CANCELLED ? 'info' : 'success' });
      setRejectOpen(false);
      await order.reload();
      reloadOrders();
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
      order.reload();
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = () => {
    if (!reason) {
      setReasonError(t('shopPanel.order.chooseReason'));
      return;
    }
    move(ORDER_STATUS.CANCELLED, { reason }); // reject = cancelled with a reason
  };

  const itemCount = o?.items.reduce((n, i) => n + i.qty, 0) || 0;

  return (
    <>
      <PageHeader
        title={o ? t('shopPanel.order.title', { number: o.number }) : ''}
        backTo="/shop-panel"
        right={o && <Badge tone={statusTone(o.status)} solid>{t(`orderStatus.${o.status}`)}</Badge>}
      />
      <main className={`${p.page} ${p.pageNoNav}`}>
        {order.loading && !o ? (
          <>
            <Skeleton height={90} radius="var(--radius-lg)" />
            <div style={{ height: 12 }} />
            <SkeletonList count={3} />
          </>
        ) : order.error && !o ? (
          <ErrorState error={order.error} onRetry={order.reload} />
        ) : (
          <>
            <p className={p.muted}>{formatDateTime(o.createdAt)}</p>

            <Card className={s.block}>
              <h2 className={s.blockTitle}>
                {t('shopPanel.order.items')} <span className={p.muted}>({itemCount})</span>
              </h2>
              <ul className={s.items}>
                {o.items.map((item) => (
                  <li key={item.productId} className={s.item}>
                    <span className={s.qty}>{item.qty} ×</span>
                    <VegDot isVeg={item.isVeg} />
                    <span className={s.itemName}>{item.name}</span>
                    <PriceTag amount={item.price * item.qty} muted />
                  </li>
                ))}
              </ul>
              <div className={p.between}>
                <strong>{t('shopPanel.order.itemTotal')}</strong>
                <PriceTag amount={o.itemTotal} size="lg" />
              </div>
              {o.instructions && (
                <div className={s.instructions}>
                  <strong>{t('shopPanel.order.instructions')}:</strong> {o.instructions}
                </div>
              )}
            </Card>

            <Card className={s.block}>
              <h2 className={s.blockTitle}>{t('shopPanel.order.payment')}</h2>
              <p className={s.paymentLine}>
                <Badge tone={o.paymentMethod === PAYMENT_METHODS.UPI ? 'info' : 'warning'}>{t(`payment.${o.paymentMethod}`)}</Badge>
                <Badge tone={o.paymentStatus === 'PAID' ? 'success' : 'neutral'} size="sm">{t(`payment.${o.paymentStatus}`)}</Badge>
              </p>
              <p className={p.muted}>
                {o.paymentMethod === PAYMENT_METHODS.UPI
                  ? t('shopPanel.order.paymentUpiPaid', { amount: formatPrice(o.itemTotal) })
                  : t('shopPanel.order.paymentCod', { amount: formatPrice(o.total) })}
              </p>
            </Card>

            <Card className={s.block}>
              <h2 className={s.blockTitle}>{t('shopPanel.order.customer')}</h2>
              <p className={s.customer}>{o.customerName}</p>
              <p className={p.muted}>
                {o.address.street}, {getPlace(o.address.placeId)?.name}
              </p>
              {o.address.landmark && <p className={s.landmark}>{t('tracking.landmark', { landmark: o.address.landmark })}</p>}
              <Button as="a" href={telLink(o.customerPhone)} variant="outline" size="sm" iconLeft={<PhoneIcon size={18} />} className={s.callBtn}>
                {t('shopPanel.order.callCustomer')}
              </Button>
            </Card>

            {[ORDER_STATUS.PREPARING, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(o.status) && (
              <Card className={s.block}>
                <p className={s.partner}>
                  <BikeIcon size={20} />
                  {partner.data ? t('shopPanel.order.partner', { name: partner.data.name }) : t('shopPanel.order.noPartner')}
                </p>
                {o.status === ORDER_STATUS.PREPARING && <p className={p.muted}>{t('shopPanel.order.waitingPickup')}</p>}
                {partner.data && o.status === ORDER_STATUS.PREPARING && (
                  <Button as="a" href={telLink(partner.data.phone)} variant="outline" size="sm" iconLeft={<PhoneIcon size={18} />} className={s.callBtn}>
                    {t('shopPanel.order.callPartner')}
                  </Button>
                )}
              </Card>
            )}

            <Card className={s.block}>
              <h2 className={s.blockTitle}>{t('shopPanel.order.timeline')}</h2>
              <StatusTimeline
                status={o.status}
                history={o.statusHistory}
                extra={o.rejectReason ? t('tracking.rejectedReason', { reason: t(`rejectReasons.${o.rejectReason}`) }) : null}
              />
            </Card>
          </>
        )}
      </main>

      {o?.status === ORDER_STATUS.PENDING && (
        <div className={p.footerBar}>
          <div className={`${p.footerInner} ${s.actions}`}>
            <Button variant="outline" size="lg" className={s.reject} iconLeft={<CloseIcon size={20} />} disabled={Boolean(busy)} onClick={() => setRejectOpen(true)}>
              {t('shopPanel.order.reject')}
            </Button>
            <Button variant="success" size="lg" iconLeft={<CheckIcon size={20} />} loading={busy === ORDER_STATUS.CONFIRMED} disabled={Boolean(busy)} onClick={() => move(ORDER_STATUS.CONFIRMED)}>
              {t('shopPanel.order.accept')}
            </Button>
          </div>
        </div>
      )}
      {o?.status === ORDER_STATUS.CONFIRMED && (
        <div className={p.footerBar}>
          <div className={p.footerInner}>
            <Button size="lg" block loading={busy === ORDER_STATUS.PREPARING} onClick={() => move(ORDER_STATUS.PREPARING)}>
              {t('shopPanel.order.markReady')}
            </Button>
          </div>
        </div>
      )}

      <BottomSheet
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t('shopPanel.order.rejectTitle')}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={busy === ORDER_STATUS.CANCELLED} onClick={confirmReject}>
              {t('shopPanel.order.rejectConfirm')}
            </Button>
          </>
        }
      >
        <fieldset className={s.reasons} aria-describedby={reasonError ? 'reason-error' : 'reason-hint'}>
          <legend id="reason-hint" className={p.muted}>{t('shopPanel.order.rejectHint')}</legend>
          {REJECT_REASONS.map((r) => (
            <label key={r} className={`${s.reason} ${reason === r ? s.reasonActive : ''}`}>
              <input
                type="radio"
                name="reject-reason"
                value={r}
                checked={reason === r}
                onChange={() => {
                  setReason(r);
                  setReasonError('');
                }}
              />
              {t(`rejectReasons.${r}`)}
            </label>
          ))}
          {reasonError && (
            <p id="reason-error" className={s.reasonError} role="alert">
              {reasonError}
            </p>
          )}
        </fieldset>
      </BottomSheet>
    </>
  );
}
