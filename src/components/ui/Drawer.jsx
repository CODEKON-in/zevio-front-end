import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../hooks/useOverlay.js';
import { t } from '../../i18n/index.js';
import { CloseIcon } from '../icons/Icons.jsx';
import { cx } from '../../utils/format.js';
import s from './Drawer.module.css';

/**
 * Drawer — panel that slides in from the side (admin detail views and forms).
 * Full screen on phones.
 * Props:
 *  - open, onClose, title
 *  - side: 'right' | 'left' (default 'right')
 *  - width: CSS width on larger screens (default '480px')
 *  - footer: ReactNode — sticky actions
 *  - children
 */
export default function Drawer({ open, onClose, title, side = 'right', width = '480px', footer, children }) {
  const { mounted, visible, panelRef } = useOverlay(open, onClose);
  const titleId = useId();
  if (!mounted) return null;

  return createPortal(
    <div className={cx(s.root, visible && s.visible, s[side])}>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={s.panel}
        style={{ '--drawer-width': width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className={s.header}>
          <h2 id={titleId} className={s.title}>{title}</h2>
          <button type="button" className={s.close} onClick={onClose} aria-label={t('common.close')}>
            <CloseIcon size={22} />
          </button>
        </div>
        <div className={s.body}>{children}</div>
        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
