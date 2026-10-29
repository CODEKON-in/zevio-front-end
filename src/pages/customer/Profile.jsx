import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { BottomSheet, Button, Card, ConfirmDialog, ErrorState, SkeletonList } from '../../components/ui/index.js';
import AddressForm from '../../components/customer/AddressForm.jsx';
import DeleteAccount from '../../components/account/DeleteAccount.jsx';
import AddressSummary from '../../components/customer/AddressSummary.jsx';
import { ChatIcon, EditIcon, InfoIcon, LogoutIcon, PhoneIcon, PlusIcon, TrashIcon } from '../../components/icons/Icons.jsx';
import { telLink, whatsappLink } from '../../utils/links.js';
import p from '../../styles/page.module.css';
import s from './Profile.module.css';

const APP_VERSION = '0.2.0';

/** Profile: name, phone, saved addresses, help, about, logout. */
export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addresses, loading, error, reload, saveAddress, deleteAddress } = useCustomer();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [deleting, setDeleting] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleSave = async (address) => {
    try {
      await saveAddress(address);
      showToast(t('address.saved'), { type: 'success' });
      setEditing(null);
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAddress(deleting.id);
      showToast(t('address.deleted'), { type: 'success' });
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setDeleting(null);
    }
  };

  // Just logged out: the app is about to show the login screen.
  if (!user) return null;

  return (
    <main className={p.page}>
      <h1 className="visually-hidden">{t('profile.title')}</h1>

      <Card className={s.user}>
        <span className={s.avatar} aria-hidden="true">
          {(user.name || '?').trim().charAt(0).toUpperCase()}
        </span>
        <div>
          <p className={s.name}>{user.name}</p>
          <p className={p.muted}>+91 {user.phone}</p>
        </div>
      </Card>

      <section className={p.section} aria-labelledby="addr-title">
        <div className={p.sectionHead}>
          <h2 id="addr-title" className={p.sectionTitle} style={{ margin: 0 }}>
            {t('profile.addresses')}
          </h2>
          <Button variant="ghost" size="sm" iconLeft={<PlusIcon size={18} />} onClick={() => setEditing('new')}>
            {t('common.add')}
          </Button>
        </div>
        {loading && !addresses.length ? (
          <SkeletonList count={1} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !addresses.length ? (
          <Card>
            <p className={p.muted}>{t('profile.noAddresses')}</p>
          </Card>
        ) : (
          <ul className={p.list}>
            {addresses.map((a) => (
              <Card as="li" key={a.id} className={s.address}>
                <AddressSummary address={a} />
                <div className={s.addressActions}>
                  <Button variant="outline" size="sm" iconLeft={<EditIcon size={16} />} onClick={() => setEditing(a)}>
                    {t('common.edit')}
                  </Button>
                  <Button variant="ghost" size="sm" iconLeft={<TrashIcon size={16} />} onClick={() => setDeleting(a)} className={s.danger}>
                    {t('common.delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <section className={p.section} aria-labelledby="help-title">
        <h2 id="help-title" className={p.sectionTitle}>{t('profile.help')}</h2>
        <div className={s.helpGrid}>
          <Button as="a" href={whatsappLink(settings.supportWhatsApp)} target="_blank" rel="noopener noreferrer" variant="outline" iconLeft={<ChatIcon size={20} />}>
            {t('profile.whatsapp')}
          </Button>
          <Button as="a" href={telLink(settings.supportPhone)} variant="outline" iconLeft={<PhoneIcon size={20} />}>
            {t('profile.call')}
          </Button>
        </div>
      </section>

      <section className={p.section} aria-labelledby="about-title">
        <h2 id="about-title" className={p.sectionTitle}>{t('profile.about')}</h2>
        <Card className={s.about}>
          <InfoIcon size={22} />
          <div className={p.stack} style={{ gap: 'var(--space-2)' }}>
            <p>{t('profile.aboutText', { app: t('app.name') })}</p>
            <p className={p.muted}>{t('profile.servedPlaces', { places: settings.servicePlaces.map((pl) => pl.name).join(', ') })}</p>
            <p className={p.muted}>{t('profile.version', { version: APP_VERSION })}</p>
          </div>
        </Card>
      </section>

      <Button variant="outline" size="lg" block iconLeft={<LogoutIcon size={20} />} onClick={() => setConfirmLogout(true)} className={`${s.logout} ${s.danger}`}>
        {t('profile.logout')}
      </Button>

      <DeleteAccount />

      <BottomSheet open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? t('address.newTitle') : t('address.editTitle')}>
        {editing && (
          <AddressForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            defaults={{ name: user.name, phone: user.phone }}
            onSubmit={handleSave}
            onNotListed={() => {
              setEditing(null);
              navigate('/not-serviceable');
            }}
          />
        )}
      </BottomSheet>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('address.deleteConfirm')}
        message={deleting ? <AddressSummary address={deleting} /> : null}
        confirmLabel={t('common.delete')}
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={confirmLogout}
        title={t('profile.logoutTitle')}
        message={t('profile.logoutBody')}
        confirmLabel={t('profile.logout')}
        tone="danger"
        onClose={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await logout();
          navigate('/', { replace: true });
        }}
      />
    </main>
  );
}
