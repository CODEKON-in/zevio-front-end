import { formatPrice, cx } from '../../utils/format.js';
import s from './PriceTag.module.css';

/**
 * PriceTag — rupee amount with Indian formatting (₹1,250).
 * Props:
 *  - amount: number
 *  - original: number — optional old price shown struck through
 *  - size: 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 *  - muted: boolean — grey text
 */
export default function PriceTag({ amount, original, size = 'md', muted = false, className }) {
  return (
    <span className={cx(s.price, s[size], muted && s.muted, className)}>
      {formatPrice(amount)}
      {original != null && original > amount && <s className={s.original}>{formatPrice(original)}</s>}
    </span>
  );
}
