import { t } from '../../i18n/index.js';
import PriceTag from '../ui/PriceTag.jsx';
import s from './BillDetails.module.css';

/**
 * BillDetails — item total + delivery fee + grand total.
 * Props: itemTotal, deliveryFee, title (optional heading text)
 */
export default function BillDetails({ itemTotal, deliveryFee, title }) {
  return (
    <section className={s.bill} aria-label={title || t('cart.bill')}>
      {title && <h2 className={s.title}>{title}</h2>}
      <dl className={s.rows}>
        <div className={s.row}>
          <dt>{t('cart.itemTotal')}</dt>
          <dd><PriceTag amount={itemTotal} muted /></dd>
        </div>
        <div className={s.row}>
          <dt>{t('cart.deliveryFee')}</dt>
          <dd><PriceTag amount={deliveryFee} muted /></dd>
        </div>
        <div className={`${s.row} ${s.total}`}>
          <dt>{t('cart.toPay')}</dt>
          <dd><PriceTag amount={itemTotal + deliveryFee} size="lg" /></dd>
        </div>
      </dl>
    </section>
  );
}
