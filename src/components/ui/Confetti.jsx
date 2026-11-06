import { useEffect, useMemo, useState } from 'react';
import { prefersMotion } from '../../utils/motion.js';
import s from './Confetti.module.css';

const COUNT = 24;
const LIFE_MS = 1200;
const TONES = ['mango', 'mangoDark', 'green', 'cream', 'ink'];

/**
 * A short, light confetti burst: 24 small CSS particles flung out from the
 * centre, gone from the page after 1.2s. Nothing at all with reduced motion.
 */
export default function Confetti() {
  const [alive, setAlive] = useState(() => prefersMotion());
  const bits = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 90 + Math.random() * 90;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.8 - 40,
          r: Math.round(Math.random() * 540 - 270),
          d: Math.round(Math.random() * 120),
          tone: TONES[i % TONES.length],
          round: i % 3 === 0,
        };
      }),
    [],
  );

  useEffect(() => {
    if (!alive) return undefined;
    const timer = setTimeout(() => setAlive(false), LIFE_MS);
    return () => clearTimeout(timer);
  }, [alive]);

  if (!alive) return null;
  return (
    <div className={s.burst} aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className={`${s.bit} ${s[b.tone]} ${b.round ? s.round : ''}`}
          style={{ '--x': `${b.x}px`, '--y': `${b.y}px`, '--r': `${b.r}deg`, animationDelay: `${b.d}ms` }}
        />
      ))}
    </div>
  );
}
