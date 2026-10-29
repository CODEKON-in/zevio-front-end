import { t } from '../../i18n/index.js';
import { InfoIcon } from '../icons/Icons.jsx';
import s from './PendingApproval.module.css';

/**
 * PendingApproval — shown to a new (or switched-off) shop or delivery partner
 * until the admin switches the account on.
 * Props: kind — 'shop' | 'delivery'
 */
export default function PendingApproval({ kind }) {
  return (
    <div className={s.banner} role="status">
      <InfoIcon size={22} />
      <div>
        <p className={s.title}>{t(`account.pending.${kind}Title`)}</p>
        <p>{t(`account.pending.${kind}Body`)}</p>
      </div>
    </div>
  );
}
