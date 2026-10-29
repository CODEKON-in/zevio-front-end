import { t } from '../../i18n/index.js';
import s from './VegDot.module.css';

/**
 * VegDot — the standard Indian veg (green) / non-veg (red) square mark.
 * Props: isVeg: true | false | null (null = not food → renders nothing), size (px, default 16)
 */
export default function VegDot({ isVeg, size = 16 }) {
  if (isVeg !== true && isVeg !== false) return null;
  const label = isVeg ? t('common.veg') : t('common.nonVeg');
  return (
    <span className={`${s.mark} ${isVeg ? s.veg : s.nonveg}`} style={{ width: size, height: size }} role="img" aria-label={label} title={label}>
      <span className={s.dot} />
    </span>
  );
}
