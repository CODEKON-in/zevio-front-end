import { t } from '../../i18n/index.js';
import { cx } from '../../utils/format.js';
import s from './Skeleton.module.css';

/**
 * Skeleton — grey placeholder block while content loads.
 * Props: width (css value, default '100%'), height (default 16), radius (css value), circle (boolean), className
 */
export default function Skeleton({ width = '100%', height = 16, radius, circle = false, className }) {
  return (
    <span
      className={cx(s.skeleton, className)}
      style={{ width: circle ? height : width, height, borderRadius: circle ? '50%' : radius }}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonList — ready-made loading placeholder for lists.
 * Props: count (default 3), variant: 'card' (image + text, for shop cards) | 'row' (product/order rows)
 */
export function SkeletonList({ count = 3, variant = 'row' }) {
  return (
    <div className={s.list} role="status" aria-label={t('common.loading')}>
      {Array.from({ length: count }, (_, i) =>
        variant === 'card' ? (
          <div key={i} className={s.card}>
            <Skeleton height="auto" radius="var(--radius-md)" className={s.cardImage} />
            <div className={s.lines}>
              <Skeleton width="70%" height={18} />
              <Skeleton width="45%" height={14} />
              <Skeleton width="30%" height={14} />
            </div>
          </div>
        ) : (
          <div key={i} className={s.row}>
            <Skeleton width={64} height={64} radius="var(--radius-md)" />
            <div className={s.lines}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="35%" height={14} />
            </div>
          </div>
        ),
      )}
    </div>
  );
}
