import { t } from '../../i18n/index.js';
import { AlertIcon, CloseIcon, InfoIcon, SuccessIcon } from '../icons/Icons.jsx';
import { cx } from '../../utils/format.js';
import s from './Toast.module.css';

const ICONS = { info: InfoIcon, success: SuccessIcon, error: AlertIcon };

/**
 * ToastViewport — rendered once by ToastProvider. Use the useToast() hook to show toasts:
 *   const { showToast } = useToast();  showToast(t('…'), { type: 'success' });
 * Props: toasts: Array<{id, message, type}>, onDismiss(id)
 */
export default function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className={s.viewport} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || InfoIcon;
        return (
          <div key={toast.id} className={cx(s.toast, s[toast.type])} role={toast.type === 'error' ? 'alert' : 'status'}>
            <Icon size={22} />
            <p className={s.message}>{toast.message}</p>
            <button type="button" className={s.close} onClick={() => onDismiss(toast.id)} aria-label={t('toast.dismiss')}>
              <CloseIcon size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
