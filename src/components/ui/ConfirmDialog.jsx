import { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { t } from '../../i18n/index.js';

/**
 * ConfirmDialog — "Are you sure?" modal with Cancel / Confirm.
 * Props:
 *  - open: boolean
 *  - title: string
 *  - message: string | ReactNode
 *  - confirmLabel, cancelLabel: string (defaults: Confirm / Cancel)
 *  - tone: 'primary' | 'danger' | 'success' (confirm button colour, default 'primary')
 *  - onConfirm: () => void | Promise — the button shows a spinner while it runs
 *  - onClose: () => void
 */
export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, tone = 'primary', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {cancelLabel || t('common.cancel')}
          </Button>
          <Button variant={tone} onClick={handleConfirm} loading={busy}>
            {confirmLabel || t('common.confirm')}
          </Button>
        </>
      }
    >
      {typeof message === 'string' ? <p>{message}</p> : message}
    </Modal>
  );
}
