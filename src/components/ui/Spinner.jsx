import s from './Spinner.module.css';

/**
 * Spinner — small loading circle.
 * Props: size (px, default 24), label (screen-reader text; omit when the parent already says "loading").
 */
export default function Spinner({ size = 24, label }) {
  return (
    <span className={s.spinner} style={{ width: size, height: size }} role={label ? 'status' : undefined}>
      {label && <span className="visually-hidden">{label}</span>}
    </span>
  );
}
