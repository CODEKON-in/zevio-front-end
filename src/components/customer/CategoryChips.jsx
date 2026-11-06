import { useLayoutEffect, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { CategoryIcon } from '../icons/Icons.jsx';
import { SHOP_CATEGORIES } from '../../utils/constants.js';
import { prefersMotion } from '../../utils/motion.js';
import s from './CategoryChips.module.css';

const ALL = ['all', ...SHOP_CATEGORIES];

/**
 * CategoryChips — horizontal scrolling filter chips.
 * Props: value (category id or 'all'), onChange(category)
 *
 * The active background is one shared pill that slides to the chosen chip
 * (FLIP with transform only), so choosing a category feels like moving a
 * marker rather than repainting two buttons. Until it has been measured, the
 * active chip paints its own background, so nothing depends on the effect.
 */
export default function CategoryChips({ value, onChange }) {
  const scroller = useRef(null);
  const pill = useRef(null);
  const last = useRef(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const root = scroller.current;
    const marker = pill.current;
    const chip = root?.querySelector('[aria-pressed="true"]');
    if (!chip || !marker) return;
    const next = { x: chip.offsetLeft, w: chip.offsetWidth, h: chip.offsetHeight, y: chip.offsetTop };
    marker.style.width = `${next.w}px`;
    marker.style.height = `${next.h}px`;
    marker.style.transform = `translate(${next.x}px, ${next.y}px)`;
    const prev = last.current;
    if (prev && prev.x !== next.x && prefersMotion()) {
      marker.animate(
        [
          { transform: `translate(${prev.x}px, ${next.y}px) scaleX(${prev.w / next.w})` },
          { transform: `translate(${next.x}px, ${next.y}px) scaleX(1)` },
        ],
        { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' },
      );
    }
    last.current = next;
    setReady(true);
  }, [value]);

  return (
    <div ref={scroller} className={`${s.scroller} ${ready ? s.ready : ''}`} role="group" aria-label={t('home.categoriesLabel')}>
      <span ref={pill} className={s.pill} aria-hidden="true" />
      {ALL.map((c) => (
        <button key={c} type="button" className={`${s.chip} ${value === c ? s.active : ''}`} aria-pressed={value === c} onClick={() => onChange(c)}>
          <CategoryIcon category={c} size={18} />
          {t(`categories.${c}`)}
        </button>
      ))}
    </div>
  );
}
