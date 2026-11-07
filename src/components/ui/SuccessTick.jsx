import s from './SuccessTick.module.css';

/**
 * The green tick that draws itself: the disc pops in, a ring breathes out
 * once, and the check is stroked along its path. Used for "Order placed" and
 * "area detected". Decorative — the text beside it says what happened.
 */
export default function SuccessTick({ size = 128, className = '' }) {
  return (
    <svg className={`${s.tick} ${className}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle className={s.ring} cx="60" cy="60" r="52" />
      <circle className={s.disc} cx="60" cy="60" r="44" />
      <path className={s.check} d="M40 61l14 14 27-29" pathLength="1" />
    </svg>
  );
}
