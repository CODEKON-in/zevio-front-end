import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { t } from '../../i18n/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { resetDemoData } from '../../services/devService.js';
import BottomSheet from '../ui/BottomSheet.jsx';
import Button from '../ui/Button.jsx';
import { CodeIcon } from '../icons/Icons.jsx';
import { ROLES, ROLE_HOME } from '../../utils/constants.js';
import s from './DevRoleSwitcher.module.css';

/**
 * DEV-only floating button to jump between Customer / Shop / Delivery / Admin,
 * reset the mock data and open the UI kit.
 * App.jsx only renders this when import.meta.env.DEV is true.
 */
export default function DevRoleSwitcher() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const { user, login, logout } = useAuth();
  const { showToast } = useToast();
  const { reload: reloadSettings } = useSettings();
  const { clearCart } = useCart();
  const navigate = useNavigate();

  const switchTo = async (role) => {
    setBusy(role);
    try {
      await login(role);
      showToast(t('dev.switched', { role: t(`roles.${role}`) }), { type: 'success' });
      setOpen(false);
      navigate(ROLE_HOME[role]);
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setBusy('reset');
    try {
      await resetDemoData();
      clearCart();
      await reloadSettings();
      showToast(t('dev.resetDone'), { type: 'success' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button type="button" className={s.fab} onClick={() => setOpen(true)} aria-label={t('dev.open')}>
        <CodeIcon size={18} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t('dev.title')}>
        <p className={s.current}>
          {user ? t('dev.current', { role: `${t(`roles.${user.role}`)} · ${user.name}` }) : t('dev.none')}
        </p>

        <h3 className={s.heading}>{t('dev.switchRole')}</h3>
        <div className={s.grid}>
          {Object.values(ROLES).map((role) => (
            <Button
              key={role}
              variant={user?.role === role ? 'primary' : 'outline'}
              loading={busy === role}
              onClick={() => switchTo(role)}
            >
              {t(`roles.${role}`)}
            </Button>
          ))}
        </div>

        <div className={s.actions}>
          <Button variant="ghost" block onClick={() => { setOpen(false); navigate('/dev/ui'); }}>
            {t('dev.uiKit')}
          </Button>
          <Button variant="outline" block loading={busy === 'reset'} onClick={reset}>
            {t('dev.reset')}
          </Button>
          {user && (
            <Button variant="ghost" block onClick={() => { logout(); setOpen(false); }}>
              {t('dev.logout')}
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
