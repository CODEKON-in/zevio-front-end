import { InfoIcon } from '../icons/Icons.jsx';
import s from './InfoNote.module.css';

/**
 * InfoNote — a short, always-visible note (icon + text), for things the person
 * must know before they act, such as the cancellation rule on checkout.
 *
 * Props:
 *  - children: the text
 *  - tone: 'info' (default) | 'warning'
 *  - className
 */
export default function InfoNote({ children, tone = 'info', className = '' }) {
  return (
    <p className={`${s.note} ${s[tone] || s.info} ${className}`}>
      <span className={s.icon} aria-hidden="true">
        <InfoIcon size={18} />
      </span>
      <span>{children}</span>
    </p>
  );
}
