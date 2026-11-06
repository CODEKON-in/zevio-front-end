import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useCart } from '../../context/CartContext.jsx';
import { formatPrice } from '../../utils/format.js';
import { bounce } from '../../utils/motion.js';
import { CartIcon, ChevronRightIcon } from '../icons/Icons.jsx';
import s from './CartBar.module.css';

/**
 * CartBar — sticky "View cart (n items · ₹total)" bar. Hidden when the cart is empty.
 * Props: aboveNav: boolean — sit above the bottom navigation bar
 *
 * The cart icon is the landing spot for "fly to cart" ([data-cart-target]).
 * When the count goes up, its badge bounces once the flying photo arrives and
 * the new number rolls in.
 */
export default function CartBar({ aboveNav = false }) {
  const { itemCount, itemTotal, cart } = useCart();
  const badge = useRef(null);
  const prev = useRef(itemCount);

  useEffect(() => {
    if (itemCount > prev.current) bounce(badge.current, prev.current === 0 ? 120 : 520);
    prev.current = itemCount;
  }, [itemCount]);

  if (!itemCount) return null;

  return (
    <div className={`${s.wrap} ${aboveNav ? s.aboveNav : ''}`}>
      <Link to="/cart" className={s.bar}>
        <span className={s.left}>
          <span className={s.iconWrap} data-cart-target>
            <CartIcon size={22} />
            <span ref={badge} className={s.badge} aria-hidden="true">
              <span key={itemCount} className={s.count}>
                {itemCount}
              </span>
            </span>
          </span>
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
