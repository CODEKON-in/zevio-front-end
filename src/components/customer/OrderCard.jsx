import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import Card from '../ui/Card.jsx';
import Badge, { statusTone } from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import PriceTag from '../ui/PriceTag.jsx';
import { ChevronRightIcon, RefreshIcon } from '../icons/Icons.jsx';
import { formatDateTime } from '../../utils/format.js';
import { FINISHED_STATUSES } from '../../utils/constants.js';
import s from './OrderCard.module.css';

/**
 * OrderCard — order summary in the customer's order list.
 * Props: order, onReorder(order) (shown for finished orders), reordering (boolean)
 */
export default function OrderCard({ order, onReorder, reordering = false }) {
  const finished = FINISHED_STATUSES.includes(order.status);
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
          <Badge tone={statusTone(order.status)}>{t(`orderStatus.${order.status}`)}</Badge>
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
    </Card>
  );
}
