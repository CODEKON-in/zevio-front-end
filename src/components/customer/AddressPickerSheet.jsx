import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import BottomSheet from '../ui/BottomSheet.jsx';
import Button from '../ui/Button.jsx';
import AddressForm from './AddressForm.jsx';
import AddressSummary from './AddressSummary.jsx';
import { CheckIcon, PlusIcon } from '../icons/Icons.jsx';
import s from './AddressPickerSheet.module.css';

/**
 * AddressPickerSheet — choose the delivery address, or add a new one.
 * Props:
 *  - open, onClose
 *  - startWithForm: boolean — open straight on the "add new" form (used when there are no addresses)
 */
export default function AddressPickerSheet({ open, onClose, startWithForm = false }) {
  const { user } = useAuth();
  const { setAddress } = useCart();
  const { addresses, selectedAddress, saveAddress } = useCustomer();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('list');

  useEffect(() => {
    if (open) setMode(startWithForm || !addresses.length ? 'form' : 'list');
  }, [open, startWithForm, addresses.length]);

  const choose = (id) => {
    setAddress(id);
    onClose();
  };

  const handleSave = async (address) => {
    try {
      const saved = await saveAddress(address);
      showToast(t('address.saved'), { type: 'success' });
      choose(saved.id);
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    }
  };

  const handleNotListed = () => {
    onClose();
    navigate('/not-serviceable');
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={mode === 'form' ? t('address.newTitle') : t('cart.chooseAddress')}>
      {mode === 'form' ? (
        <AddressForm defaults={{ name: user?.name, phone: user?.phone }} onSubmit={handleSave} onNotListed={handleNotListed} />
      ) : (
        <div className={s.list}>
          <ul className={s.options} role="list">
            {addresses.map((a) => {
              const active = selectedAddress?.id === a.id;
              return (
                <li key={a.id}>
                  <button type="button" className={`${s.option} ${active ? s.active : ''}`} onClick={() => choose(a.id)} aria-pressed={active}>
                    <AddressSummary address={a} />
                    {active && (
                      <span className={s.check} aria-label={t('address.selected')}>
                        <CheckIcon size={18} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <Button variant="outline" block iconLeft={<PlusIcon size={20} />} onClick={() => setMode('form')}>
            {t('address.add')}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
