import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../hooks/useOverlay.js';
import { t } from '../../i18n/index.js';
import { CloseIcon } from '../icons/Icons.jsx';
import { cx } from '../../utils/format.js';
import s from './Modal.module.css';

/**
 * Modal — centred dialog (confirmations, admin forms).
 * Props:
 *  - open: boolean
 *  - onClose: () => void — backdrop tap, close button, Escape
 *  - title: string
 *  - footer: ReactNode — action buttons
 *  - size: 'sm' | 'md' | 'lg' (default 'sm')
 *  - children: body content
 */
export default function Modal({ open, onClose, title, footer, size = 'sm', children }) {
  const { mounted, visible, panelRef } = useOverlay(open, onClose);
  const titleId = useId();
  if (!mounted) return null;

  return createPortal(
    <div className={cx(s.root, visible && s.visible)}>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={cx(s.dialog, s[size])}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
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
