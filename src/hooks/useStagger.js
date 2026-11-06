import { useEffect, useRef } from 'react';
import { prefersMotion } from '../utils/motion.js';

const STEP_MS = 40;
const MAX_STAGGERED = 8;

/**
 * Staggered entrance for a list: each child fades and rises in 40ms after the
 * one before, as it first scrolls into view. Only the first eight of a batch
 * are staggered; the rest appear at once, so a long list is never slow to
 * fill. Each item animates once.
 *
 * Usage: const ref = useStagger(); <ul ref={ref} data-stagger> … </ul>
 *
 * Items start hidden only through CSS that applies when motion is allowed
 * ([data-stagger] > :not([data-shown]), see global.css). Without motion, or
 * without IntersectionObserver, they are all marked shown straight away.
 */
export function useStagger() {
  const ref = useRef(null);

  // Runs after every render: a list that re-renders with new rows (a filter,
  // a reload) gets its new rows picked up; rows already shown are skipped.
  useEffect(() => {
    const list = ref.current;
    if (!list) return undefined;
    const pending = [...list.children].filter((el) => !el.hasAttribute('data-shown'));
    if (!pending.length) return undefined;

    const show = (el) => el.setAttribute('data-shown', '');
    if (!prefersMotion() || typeof IntersectionObserver === 'undefined') {
      pending.forEach(show);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          io.unobserve(el);
          show(el);
          if (n < MAX_STAGGERED) {
            el.animate(
              [
                { opacity: 0, transform: 'translateY(12px)' },
                { opacity: 1, transform: 'none' },
              ],
              { duration: 320, delay: n * STEP_MS, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' },
            );
          }
          n += 1;
        }
      },
      { rootMargin: '0px 0px -24px 0px' },
    );
    pending.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });

  return ref;
}
