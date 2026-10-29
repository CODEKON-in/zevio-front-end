import { useEffect, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { assignPartner, getOrderById, updateOrderStatus } from '../../services/orderService.js';
import Drawer from '../ui/Drawer.jsx';
import Badge, { statusTone } from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import PriceTag from '../ui/PriceTag.jsx';
import Select from '../ui/Select.jsx';
import { SkeletonList } from '../ui/Skeleton.jsx';
import StatusTimeline from '../ui/StatusTimeline.jsx';
import VegDot from '../ui/VegDot.jsx';
import { ORDER_STATUS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';
import a from '../../pages/admin/admin.module.css';
import s from './AdminOrderDrawer.module.css';

const ALL_STATUSES = Object.values(ORDER_STATUS);

/**
 * AdminOrderDrawer — full order details with partner assignment and manual status change.
 * Props: orderId (null = closed), partners (list for the dropdown), onClose, onChanged (reload the table)
 */
export default function AdminOrderDrawer({ orderId, partners = [], onClose, onChanged }) {
  const { getPlace } = useSettings();
  const { showToast } = useToast();
  const order = useAsync(() => (orderId ? getOrderById(orderId) : Promise.resolve(null)), [orderId]);
  const o = order.data;

  const [partnerId, setPartnerId] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);

  // Each dropdown follows the saved order separately, so refreshing after one
  // save never overwrites what the admin is choosing in the other dropdown.
  const oid = o?.id;
  const savedPartner = o?.partnerId || '';
  const savedStatus = o?.status || '';
  useEffect(() => {
    if (oid) setPartnerId(savedPartner);
  }, [oid, savedPartner]);
  useEffect(() => {
    if (oid) setStatus(savedStatus);
  }, [oid, savedStatus]);

  const savePartner = async () => {
    setSaving(true);
    try {
      await assignPartner(o.id, partnerId || null);
      showToast(t('admin.orderDrawer.assigned'), { type: 'success' });
      await order.reload();
      onChanged?.();
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    try {
      await updateOrderStatus(o.id, status, { force: true });
      showToast(t('admin.orderDrawer.statusChanged', { status: t(`orderStatus.${status}`) }), { type: 'success' });
      setConfirmStatus(false);
      await order.reload();
      onChanged?.();
    } catch (e) {
      setConfirmStatus(false);
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    }
  };

  const partnerOptions = partners.map((p) => ({
    value: p.id,
    label: t('admin.orderDrawer.partnerOption', {
      name: p.name,
      status: p.isOnline ? t('admin.common.online') : t('admin.common.offline'),
      place: getPlace(p.placeId)?.name || '',
    }),
    disabled: !p.isActive,
  }));

  return (
    <Drawer open={Boolean(orderId)} onClose={onClose} title={o ? t('admin.orderDrawer.title', { number: o.number }) : ''} width="520px">
      {order.loading && !o ? (
        <SkeletonList count={3} />
      ) : order.error && !o ? (
        <ErrorState error={order.error} onRetry={order.reload} />
      ) : o ? (
        <div className={s.wrap}>
          <div className={s.top}>
            <Badge tone={statusTone(o.status)} solid>{t(`orderStatus.${o.status}`)}</Badge>
            <span className={a.muted}>{formatDateTime(o.createdAt)}</span>
          </div>

          <section className={s.grid2}>
            <div>
              <h3 className={s.h}>{t('admin.orderDrawer.customer')}</h3>
              <p className={a.cellMain}>{o.customerName}</p>
              <p className={a.muted}>+91 {o.customerPhone}</p>
              <p className={s.small}>
                {o.address.street}, {getPlace(o.address.placeId)?.name}
              </p>
              <p className={s.small}>{t('tracking.landmark', { landmark: o.address.landmark })}</p>
            </div>
            <div>
              <h3 className={s.h}>{t('admin.orderDrawer.shop')}</h3>
              <p className={a.cellMain}>{o.shopName}</p>
              <p className={a.muted}>+91 {o.shopPhone}</p>
              <p className={s.small}>{getPlace(o.shopPlaceId)?.name}</p>
            </div>
          </section>

          <section>
            <h3 className={s.h}>{t('admin.orderDrawer.items')}</h3>
            <ul className={s.items}>
              {o.items.map((i) => (
                <li key={i.productId}>
                  <VegDot isVeg={i.isVeg} size={14} />
                  <span className={s.itemName}>{i.name} × {i.qty}</span>
                  <PriceTag amount={i.price * i.qty} size="sm" muted />
                </li>
              ))}
            </ul>
            <dl className={s.bill}>
              <div><dt>{t('cart.itemTotal')}</dt><dd><PriceTag amount={o.itemTotal} size="sm" /></dd></div>
              <div><dt>{t('cart.deliveryFee')}</dt><dd><PriceTag amount={o.deliveryFee} size="sm" /></dd></div>
              <div className={s.total}><dt>{t('common.total')}</dt><dd><PriceTag amount={o.total} /></dd></div>
            </dl>
            <p className={s.payment}>
              {t('admin.orderDrawer.payment')}: <strong>{t(`payment.${o.paymentMethod}`)}</strong>{' '}
              <Badge tone={o.paymentStatus === 'PAID' ? 'success' : 'warning'} size="sm">{t(`payment.${o.paymentStatus}`)}</Badge>
            </p>
            {o.instructions && (
              <p className={s.small}>
                <strong>{t('admin.orderDrawer.instructions')}:</strong> {o.instructions}
              </p>
            )}
          </section>

          <section className={s.action}>
            <h3 className={s.h}>{t('admin.orderDrawer.partner')}</h3>
            <div className={s.row}>
              <Select
                label={t('admin.orderDrawer.partnerLabel')}
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                options={[{ value: '', label: t('admin.orderDrawer.partnerNone') }, ...partnerOptions]}
              />
              <Button variant="secondary" loading={saving} disabled={partnerId === (o.partnerId || '')} onClick={savePartner}>
                {t('admin.orderDrawer.assign')}
              </Button>
            </div>
          </section>

          <section className={s.action}>
            <div className={s.row}>
              <Select
                label={t('admin.orderDrawer.statusLabel')}
                hint={t('admin.orderDrawer.statusHint')}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={ALL_STATUSES.map((st) => ({ value: st, label: t(`orderStatus.${st}`) }))}
              />
              <Button variant="outline" disabled={status === o.status} onClick={() => setConfirmStatus(true)}>
                {t('admin.orderDrawer.changeStatus')}
              </Button>
            </div>
          </section>

          <section>
            <h3 className={s.h}>{t('admin.orderDrawer.timeline')}</h3>
            <StatusTimeline
              status={o.status}
              history={o.statusHistory}
              extra={o.rejectReason ? t('tracking.rejectedReason', { reason: t(`rejectReasons.${o.rejectReason}`) }) : null}
            />
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmStatus}
        title={t('admin.orderDrawer.confirmTitle', { status: status ? t(`orderStatus.${status}`) : '' })}
        message={t('admin.orderDrawer.confirmBody')}
        confirmLabel={t('admin.orderDrawer.changeStatus')}
        tone="danger"
        onClose={() => setConfirmStatus(false)}
        onConfirm={changeStatus}
      />
    </Drawer>
  );
}
