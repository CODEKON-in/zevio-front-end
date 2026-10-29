import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import { TrashIcon } from '../icons/Icons.jsx';
import { ROLES } from '../../utils/constants.js';
import s from './DeleteAccount.module.css';

/**
 * DeleteAccount — "Delete account" section for the account pages of customers,
 * shop owners and delivery partners. Asks the person to type DELETE first.
 * Refused (with a clear message) while they have orders in progress.
 */
export default function DeleteAccount() {
  const { user, deleteAccount } = useAuth();
  const { clearCart, setAddress } = useCart();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const role = user.role;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setWord('');
    setError('');
  };

  const confirm = async () => {
    if (word.trim() !== t('account.confirmWord')) {
      setError(t('account.confirmError'));
      return;
    }
    setBusy(true);
    try {
      await deleteAccount();
      if (role === ROLES.CUSTOMER) {
        clearCart();
        setAddress(null);
      }
      showToast(t('account.deleted'), { type: 'success' });
    } catch (e) {
      setBusy(false);
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error', duration: 7000 });
    }
  };

  return (
    <section className={s.box} aria-labelledby="delete-account-title">
      <h2 id="delete-account-title" className={s.title}>
        {t('account.deleteTitle')}
      </h2>
      <p className={s.hint}>{t('account.deleteHint')}</p>
      <Button variant="danger" size="lg" block iconLeft={<TrashIcon size={20} />} onClick={() => setOpen(true)}>
        {t('account.deleteButton')}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={t('account.deleteConfirmTitle')}
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirm} loading={busy}>
              {t('account.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('account.deleteIntro')}</p>
        <ul className={s.list}>
          {['a', 'b', 'c'].map((k) => (
            <li key={k}>{t(`account.deleteWhat.${role}.${k}`)}</li>
          ))}
        </ul>
        <Input
          label={t('account.typeToConfirm')}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={word}
          onChange={(e) => {
            setWord(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
          error={error}
        />
      </Modal>
    </section>
  );
}
