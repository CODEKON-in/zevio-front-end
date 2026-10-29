import { Link } from 'react-router-dom';
import s from './StatCard.module.css';

/**
 * StatCard — big number with a label.
 * Props: label, value (node), hint, tone ('neutral'|'success'|'danger'|'warning'|'primary'), icon, to (makes it a link)
 */
export default function StatCard({ label, value, hint, tone = 'neutral', icon, to }) {
  const content = (
    <>
      <span className={s.top}>
        <span className={s.label}>{label}</span>
        {icon && <span className={s.icon}>{icon}</span>}
      </span>
      <span className={s.value}>{value}</span>
      {hint && <span className={s.hint}>{hint}</span>}
    </>
  );
  const cls = `${s.card} ${s[tone]} ${to ? s.link : ''}`;
  return to ? <Link to={to} className={cls}>{content}</Link> : <div className={cls}>{content}</div>;
}
