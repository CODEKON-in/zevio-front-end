import { memo } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import Badge, { statusTone } from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import PriceTag from '../ui/PriceTag.jsx';
import { ChevronRightIcon, ClockIcon, LocationIcon } from '../icons/Icons.jsx';
import { ORDER_STATUS } from '../../utils/constants.js';
import { formatTime, minutesSince } from '../../utils/format.js';
import s from './ShopOrderCard.module.css';

function timeAgo(iso) {
  const m = minutesSince(iso);
  if (m < 1) return t('time.justNow');
  if (m < 60) return t('time.minAgo', { count: m });
  return formatTime(iso);
}

/**
 * ShopOrderCard — order row in the shop dashboard.
 * Props:
 *  - order
 *  - fresh: boolean — just arrived, highlight it
 *  - onQuickAction(order): Accept (PENDING) or Mark ready (CONFIRMED)
 *  - busy: boolean — quick action running
 */
function ShopOrderCard({ order, fresh = false, onQuickAction, busy = false }) {
  const { getPlace } = useSettings();
  const count = order.items.reduce((n, i) => n + i.qty, 0);
  const quickLabel =
    order.status === ORDER_STATUS.PENDING ? t('shopPanel.orderCard.accept') : order.status === ORDER_STATUS.CONFIRMED ? t('shopPanel.orderCard.markReady') : null;

  return (
    <li className={`${s.card} ${fresh ? s.fresh : ''} ${order.status === ORDER_STATUS.PENDING ? s.placed : ''}`}>
      <Link to={`/shop-panel/orders/${order.id}`} className={s.link} aria-label={t('shopPanel.orderCard.open', { number: order.number })}>
        <div className={s.top}>
          <div className={s.title}>
            <span className={s.number}>#{order.number}</span>
            {fresh && <Badge tone="danger" solid size="sm">{t('shopPanel.orderCard.newBadge')}</Badge>}
          </div>
          <Badge tone={statusTone(order.status)} size="sm">{t(`orderStatus.${order.status}`)}</Badge>
        </div>
        <p className={s.customer}>{order.customerName}</p>
        <p className={s.meta}>
          <span className={s.metaItem}><LocationIcon size={15} />{getPlace(order.address.placeId)?.name}</span>
          <span className={s.metaItem}><ClockIcon size={15} />{timeAgo(order.createdAt)}</span>
        </p>
        <p className={s.items}>{order.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</p>
        <div className={s.bottom}>
          <span className={s.meta}>
            {t('shopPanel.orderCard.items', { count })} · {t(`payment.${order.paymentMethod}`)}
          </span>
          <span className={s.amount}>
            <PriceTag amount={order.itemTotal} />
            <ChevronRightIcon size={18} />
          </span>
        </div>
      </Link>
      {quickLabel && onQuickAction && (
        <div className={s.actions}>
          <Button variant={order.status === ORDER_STATUS.PENDING ? 'success' : 'primary'} block loading={busy} onClick={() => onQuickAction(order)}>
            {quickLabel}
          </Button>
        </div>
      )}
    </li>
  );
}

export default memo(ShopOrderCard);
