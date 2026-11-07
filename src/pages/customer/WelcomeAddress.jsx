import { Navigate, useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useLocationStatus } from '../../context/LocationContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { SkeletonList } from '../../components/ui/index.js';
import AddressForm from '../../components/customer/AddressForm.jsx';
import { useRedetect } from '../../hooks/useAddressReturn.js';
import p from '../../styles/page.module.css';
import s from './WelcomeAddress.module.css';

/**
 * Right after the location step (in range): "Add your delivery address".
 * The area is already known and locked; they type the door number and street,
 * or tap "Skip for now" and go Home with no address saved — their area stays.
 * Someone who already has addresses (signing in on a new phone) goes Home.
 */
export default function WelcomeAddress() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setAddress } = useCart();
  const { addresses, loading, saveAddress } = useCustomer();
  const { isOutOfRange } = useLocationStatus();
  const { showToast } = useToast();
  const redetect = useRedetect();

  const home = () => navigate('/', { replace: true });

  if (isOutOfRange) return <Navigate to="/" replace />;
  if (!loading && addresses.length) return <Navigate to="/" replace />;

  const handleSave = async (address) => {
    try {
      const saved = await saveAddress(address);
      setAddress(saved.id);
      showToast(t('address.saved'), { type: 'success' });
      home();
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    }
  };

  return (
    <main className={`${p.page} ${p.pageNoNav} ${s.page}`}>
      <h1 className={s.title}>{t('address.welcomeTitle')}</h1>
      <p className={s.body}>{t('address.welcomeBody')}</p>
      {loading ? (
        <SkeletonList count={2} />
      ) : (
        <div className={s.card}>
          <AddressForm
            defaults={{ name: user?.name, phone: user?.phone }}
            onSubmit={handleSave}
            allowSkip
            onSkip={home}
            onRedetect={redetect}
            isFirst
          />
        </div>
      )}
    </main>
  );
}
