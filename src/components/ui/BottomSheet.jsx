import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../hooks/useOverlay.js';
import { t } from '../../i18n/index.js';
import { CloseIcon } from '../icons/Icons.jsx';
import s from './BottomSheet.module.css';

/**
 * BottomSheet — panel that slides up from the bottom (mobile-friendly dialog).
 * Props:
 *  - open: boolean
 *  - onClose: () => void — called on backdrop tap, close button and Escape
 *  - title: string — heading (also the dialog's accessible name)
 *  - footer: ReactNode — sticky actions at the bottom (e.g. two Buttons)
 *  - children: body content
 */
export default function BottomSheet({ open, onClose, title, footer, children }) {
  const { mounted, visible, panelRef } = useOverlay(open, onClose);
  const titleId = useId();
  if (!mounted) return null;

  return createPortal(
    <div className={`${s.root} ${visible ? s.visible : ''}`}>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className={s.handle} aria-hidden="true" />
        {title && (
          <div className={s.header}>
            <h2 id={titleId} className={s.title}>{title}</h2>
            <button type="button" className={s.close} onClick={onClose} aria-label={t('common.close')}>
              <CloseIcon size={22} />
            </button>
          </div>
        )}
        <div className={s.body}>{children}</div>
        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
