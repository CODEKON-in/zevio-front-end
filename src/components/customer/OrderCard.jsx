import { memo } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import Card from '../ui/Card.jsx';
import Badge, { statusTone } from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import PriceTag from '../ui/PriceTag.jsx';
import { ChevronRightIcon, RefreshIcon } from '../icons/Icons.jsx';
import { formatDateTime } from '../../utils/format.js';
import { FINISHED_STATUSES } from '../../utils/constants.js';
import { canCancelOrder } from '../../utils/orderRules.js';
import s from './OrderCard.module.css';

/**
 * OrderCard — order summary in the customer's order list.
 * Props: order, onReorder(order) (finished orders), reordering,
 *        onCancel(order) (while the order can still be cancelled), cancelling
 */
function OrderCard({ order, onReorder, reordering = false, onCancel, cancelling = false }) {
  const finished = FINISHED_STATUSES.includes(order.status);
  // Same rule as the tracking page — cancel without opening the order first.
  const cancellable = canCancelOrder(order);
  const itemsText = order.items.map((i) => `${i.name} × ${i.qty}`).join(', ');

  return (
    <Card as="li" padding="none" className={s.card}>
      <Link to={`/orders/${order.id}`} className={s.link}>
        <div className={s.top}>
          <div className={s.titleWrap}>
            <h3 className={s.shop}>{order.shopName}</h3>
            <p className={s.meta}>
              {t('orders.orderNo', { number: order.number })} · {formatDateTime(order.createdAt)}
            </p>
          </div>
          <span className={s.badges}>
            {order.isGiftOrder && <Badge tone="warning" size="sm">{t('gift.badge')}</Badge>}
            <Badge tone={statusTone(order.status)}>{t(`orderStatus.${order.status}`)}</Badge>
          </span>
        </div>
        <p className={s.items}>{itemsText}</p>
        <div className={s.bottom}>
          <PriceTag amount={order.total} />
          <span className={s.details}>
            {t('orders.viewDetails')}
            <ChevronRightIcon size={18} />
          </span>
        </div>
      </Link>
      {finished && onReorder && (
        <div className={s.actions}>
          <Button variant="secondary" size="sm" block iconLeft={<RefreshIcon size={18} />} loading={reordering} onClick={() => onReorder(order)}>
            {t('orders.reorder')}
          </Button>
        </div>
      )}
      {cancellable && onCancel && (
        <div className={s.actions}>
          <Button
            variant="ghost"
            size="sm"
            block
            loading={cancelling}
            className={s.cancel}
            aria-label={t('orders.cancelAria', { number: order.number })}
            onClick={() => onCancel(order)}
          >
            {t('orders.cancel')}
          </Button>
        </div>
      )}
    </Card>
  );
}

/* The order list re-renders on every poll of the tracking status, so a card
   whose own order has not changed should not re-render with it. */
export default memo(OrderCard);
