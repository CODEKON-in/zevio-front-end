import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { t } from '../../i18n/index.js';
import { WifiOffIcon } from '../icons/Icons.jsx';
import s from './OfflineBanner.module.css';

/** Fixed banner at the top while navigator.onLine is false. */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className={s.banner} role="status">
      <WifiOffIcon size={20} />
      <span>{t('offline.banner')}</span>
    </div>
  );
}
