import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useCart } from '../../context/CartContext.jsx';
import { formatPrice } from '../../utils/format.js';
import { CartIcon, ChevronRightIcon } from '../icons/Icons.jsx';
import s from './CartBar.module.css';

/**
 * CartBar — sticky "View cart (n items · ₹total)" bar. Hidden when the cart is empty.
 * Props: aboveNav: boolean — sit above the bottom navigation bar
 */
export default function CartBar({ aboveNav = false }) {
  const { itemCount, itemTotal, cart } = useCart();
  if (!itemCount) return null;

  return (
    <div className={`${s.wrap} ${aboveNav ? s.aboveNav : ''}`}>
      <Link to="/cart" className={s.bar}>
        <span className={s.left}>
          <CartIcon size={22} />
          <span className={s.text}>
            <span className={s.summary}>{t('cartBar.summary', { count: itemCount, total: formatPrice(itemTotal) })}</span>
            <span className={s.shop}>{cart.shopName}</span>
          </span>
        </span>
        <span className={s.right}>
          {t('cartBar.view')}
          <ChevronRightIcon size={20} />
        </span>
      </Link>
    </div>
  );
}
