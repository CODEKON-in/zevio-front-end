import { useEffect, useRef } from 'react';
import { prefersMotion } from '../../utils/motion.js';

const DURATION_MS = 700;

/**
 * Shows `value` and, the first time it appears, counts its number up from 0.
 * Works for plain numbers and for text with one number in it ("₹1,240",
 * "12 of 15" counts the first). The real value is always what is rendered by
 * React; the count only rewrites the text during the first 0.7s, so screen
 * readers and later updates always see the true figure.
 */
export default function CountUp({ value }) {
  const ref = useRef(null);
  const ran = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (ran.current || !el || !prefersMotion()) return undefined;
    const text = String(value);
    const m = text.match(/^(\D*)([\d,]+)(.*)$/);
    if (!m) return undefined;
    const target = Number(m[2].replace(/,/g, ''));
    if (!Number.isFinite(target) || target === 0) return undefined;
    ran.current = true;
    const grouped = m[2].includes(',');
    const fmt = (n) => (grouped ? n.toLocaleString('en-IN') : String(n));
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - k) ** 3;
      el.textContent = `${m[1]}${fmt(Math.round(target * eased))}${m[3]}`;
      if (k < 1) frame = requestAnimationFrame(tick);
      else el.textContent = text;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = text;
      // Interrupted before it finished (React re-ran the effect): allow a rerun.
      if (performance.now() - start < DURATION_MS) ran.current = false;
    };
  }, [value]);

  return <span ref={ref}>{value}</span>;
}
