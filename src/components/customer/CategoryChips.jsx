import { t } from '../../i18n/index.js';
import { CategoryIcon } from '../icons/Icons.jsx';
import { SHOP_CATEGORIES } from '../../utils/constants.js';
import s from './CategoryChips.module.css';

const ALL = ['all', ...SHOP_CATEGORIES];

/**
 * CategoryChips — horizontal scrolling filter chips.
 * Props: value (category id or 'all'), onChange(category)
 */
export default function CategoryChips({ value, onChange }) {
  return (
    <div className={s.scroller} role="group" aria-label={t('home.categoriesLabel')}>
      {ALL.map((c) => (
        <button key={c} type="button" className={`${s.chip} ${value === c ? s.active : ''}`} aria-pressed={value === c} onClick={() => onChange(c)}>
          <CategoryIcon category={c} size={18} />
          {t(`categories.${c}`)}
        </button>
      ))}
    </div>
  );
}
