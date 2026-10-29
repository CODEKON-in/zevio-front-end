import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { t } from '../i18n/index.js';

/**
 * Signs the person out (with a message) when their own account no longer
 * exists — deleted, or the saved login is from old data.
 * @param {Error|null} error  error from loading the account
 * @param {object|undefined} record  the loaded account (shop / partner / customer)
 */
export function useAccountGone(error, record) {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const gone = error?.code === 'NOT_FOUND' || Boolean(record?.deleted);
  useEffect(() => {
    if (!gone) return;
    showToast(t('account.gone'), { type: 'info', duration: 6000 });
    logout();
  }, [gone, logout, showToast]);
}
