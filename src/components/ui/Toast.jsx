import { useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { AlertIcon, CloseIcon, InfoIcon, SuccessIcon } from '../icons/Icons.jsx';
import { cx } from '../../utils/format.js';
import s from './Toast.module.css';

const ICONS = { info: InfoIcon, success: SuccessIcon, error: AlertIcon };
/** How far a toast must be pushed before letting go dismisses it. */
const SWIPE_AWAY_PX = 56;

/**
 * One toast, swipeable.
 *
 * Flicking a message away is the gesture people already use on notifications,
 * and it beats hunting for a small × with one thumb. The card follows the
 * finger (transform only — no layout work mid-drag) and springs back if the
 * push was too small to mean it.
 */
function Toast({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] || InfoIcon;
  const [dx, setDx] = useState(0);
  const startX = useRef(null);

  const end = () => {
    if (startX.current === null) return;
    startX.current = null;
    if (Math.abs(dx) > SWIPE_AWAY_PX) onDismiss(toast.id);
    else setDx(0);
  };

  return (
    <div
      className={cx(s.toast, s[toast.type])}
      role={toast.type === 'error' ? 'alert' : 'status'}
      style={dx ? { transform: `translateX(${dx}px)`, opacity: Math.max(0.3, 1 - Math.abs(dx) / 180) } : undefined}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return; // dragging with a mouse would fight text selection
        startX.current = e.clientX;
      }}
      onPointerMove={(e) => {
        if (startX.current === null) return;
        setDx(e.clientX - startX.current);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <Icon size={22} />
      <p className={s.message}>{toast.message}</p>
      <button type="button" className={s.close} onClick={() => onDismiss(toast.id)} aria-label={t('toast.dismiss')}>
        <CloseIcon size={18} />
      </button>
    </div>
  );
}

/**
 * ToastViewport — rendered once by ToastProvider. Use the useToast() hook to show toasts:
 *   const { showToast } = useToast();  showToast(t('…'), { type: 'success' });
 * Props: toasts: Array<{id, message, type}>, onDismiss(id)
 */
export default function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className={s.viewport} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
