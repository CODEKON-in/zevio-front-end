import { BoxIcon } from '../icons/Icons.jsx';
import { t } from '../../i18n/index.js';
import s from './EmptyState.module.css';

/**
 * EmptyState — friendly message when a list or page has nothing to show.
 * Props:
 *  - icon: ReactNode (default box icon)
 *  - title: string (default "Nothing here yet")
 *  - message: string
 *  - action: ReactNode — usually a Button
 *  - tone: 'neutral' | 'danger' — danger tints the icon red (used by ErrorState)
 */
export default function EmptyState({ icon, title, message, action, tone = 'neutral', role }) {
  return (
    <div className={s.root} role={role}>
      <div className={`${s.icon} ${tone === 'danger' ? s.danger : ''}`}>{icon || <BoxIcon size={36} />}</div>
      <h2 className={s.title}>{title || t('common.emptyTitle')}</h2>
      {message && <p className={s.message}>{message}</p>}
      {action && <div className={s.action}>{action}</div>}
    </div>
  );
}
