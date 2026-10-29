import { memo } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import Badge, { statusTone } from '../ui/Badge.jsx';
import { ChevronRightIcon, LocationIcon, StoreIcon } from '../icons/Icons.jsx';
import { formatPrice } from '../../utils/format.js';
import { cashToCollect } from '../../utils/orders.js';
import s from './DeliveryOrderCard.module.css';

/**
 * DeliveryOrderCard — one assigned order: pickup → drop, cash to collect, next step.
 * Props: order
 */
function DeliveryOrderCard({ order }) {
  const { getPlace } = useSettings();
  const cash = cashToCollect(order);
  const next = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(order.status) ? t(`delivery.card.next.${order.status}`) : '';

  return (
    <li className={s.card}>
      <Link to={`/delivery/orders/${order.id}`} className={s.link} aria-label={t('delivery.card.open', { number: order.number })}>
        <div className={s.top}>
          <span className={s.number}>#{order.number}</span>
          <Badge tone={statusTone(order.status)} size="sm">{t(`orderStatus.${order.status}`)}</Badge>
        </div>

        <div className={s.route}>
          <p className={s.stop}>
            <StoreIcon size={18} className={s.pickupIcon} />
            <span>
              <span className={s.label}>{t('delivery.card.pickup')}</span>
              <span className={s.place}>{order.shopName} · {getPlace(order.shopPlaceId)?.name}</span>
            </span>
          </p>
          <p className={s.stop}>
            <LocationIcon size={18} className={s.dropIcon} />
            <span>
              <span className={s.label}>{t('delivery.card.drop')}</span>
              <span className={s.place}>{order.customerName} · {getPlace(order.address.placeId)?.name}</span>
              <span className={s.landmark}>{order.address.landmark}</span>
            </span>
          </p>
        </div>

        <div className={s.bottom}>
          {cash > 0 && next ? (
            <span className={s.collect}>{t('delivery.card.collect', { amount: formatPrice(cash) })}</span>
          ) : cash > 0 && order.status === 'DELIVERED' ? (
            <span className={s.collected}>{t('delivery.card.collected', { amount: formatPrice(cash) })}</span>
          ) : cash > 0 ? (
            <span />
          ) : (
            <span className={s.paid}>{t('delivery.card.paidOnline')}</span>
          )}
          <span className={s.next}>
            {next}
            <ChevronRightIcon size={18} />
          </span>
        </div>
      </Link>
    </li>
  );
}

export default memo(DeliveryOrderCard);
