import { NavLink } from 'react-router-dom';
import s from './TabBar.module.css';

/**
 * TabBar — fixed bottom navigation (customer, shop and delivery apps).
 * Props:
 *  - label: accessible name for the <nav>
 *  - items: Array<{ to, label, Icon, end?, badge? }>  badge = number shown on the icon
 */
export default function TabBar({ label, items }) {
  return (
    <nav className={s.nav} aria-label={label}>
      {items.map(({ to, label: text, Icon, end, badge }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `${s.item} ${isActive ? s.active : ''}`}>
          <span className={s.iconWrap}>
            <Icon size={24} />
            {badge > 0 && <span className={s.badge}>{badge}</span>}
          </span>
          <span className={s.label}>{text}</span>
        </NavLink>
      ))}
    </nav>
  );
}
