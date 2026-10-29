import { cx } from '../../utils/format.js';
import s from './Badge.module.css';

/**
 * Badge — short status label.
 * Props:
 *  - tone: 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info' (default 'neutral')
 *  - size: 'sm' | 'md' (default 'md')
 *  - icon: ReactNode (optional, shown before text)
 *  - solid: boolean — filled background with white text
 */
export default function Badge({ tone = 'neutral', size = 'md', icon, solid = false, className, children }) {
  return (
    <span className={cx(s.badge, s[tone], s[size], solid && s.solid, className)}>
      {icon}
      {children}
    </span>
  );
}

/** Maps an order status to a badge tone. */
export function statusTone(status) {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'CONFIRMED':
    case 'PREPARING':
      return 'info';
    case 'OUT_FOR_DELIVERY':
      return 'primary';
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
}
