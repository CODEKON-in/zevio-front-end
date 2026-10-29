import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Button, Card, ConfirmDialog, ErrorState, SkeletonList } from '../../components/ui/index.js';
import { LogoutIcon, PhoneIcon } from '../../components/icons/Icons.jsx';
import { telLink } from '../../utils/links.js';
import p from '../../styles/page.module.css';
import DeleteAccount from '../../components/account/DeleteAccount.jsx';
import s from './DeliveryAccount.module.css';

/** Partner account: details, support call, logout (goes offline first). */
export default function DeliveryAccount() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { partner, partnerLoading, partnerError, reloadPartner, setOnline } = useDelivery();
  const { settings, getPlace } = useSettings();
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (partnerLoading && !partner) return <main className={p.page}><SkeletonList count={2} /></main>;
  if (partnerError && !partner) return <main className={p.page}><ErrorState error={partnerError} onRetry={reloadPartner} /></main>;

  return (
    <main className={p.page}>
      <h1 className="visually-hidden">{t('delivery.account.title')}</h1>
      <Card className={s.user}>
        <span className={s.avatar} aria-hidden="true">{partner.name.charAt(0)}</span>
        <div>
          <p className={s.name}>{partner.name}</p>
          <p className={p.muted}>{partner.isOnline ? t('delivery.home.online') : t('delivery.home.offline')}</p>
        </div>
      </Card>

      <Card className={s.block}>
        <dl className={s.details}>
          <div><dt>{t('delivery.account.phone')}</dt><dd>+91 {partner.phone}</dd></div>
          <div><dt>{t('delivery.account.vehicle')}</dt><dd>{partner.vehicle || '—'}</dd></div>
          <div><dt>{t('delivery.account.base')}</dt><dd>{getPlace(partner.placeId)?.name || '—'}</dd></div>
        </dl>
      </Card>

      <Button as="a" href={telLink(settings.supportPhone)} variant="outline" size="lg" block iconLeft={<PhoneIcon size={20} />} className={s.block}>
        {t('delivery.account.support')}
      </Button>
      <Button variant="outline" size="lg" block iconLeft={<LogoutIcon size={20} />} className={s.logout} onClick={() => setConfirmLogout(true)}>
        {t('delivery.account.logout')}
      </Button>

      <DeleteAccount />

      <ConfirmDialog
        open={confirmLogout}
        title={t('delivery.account.logoutTitle')}
        message={partner.isOnline ? t('delivery.account.logoutOnlineNote') : ''}
        confirmLabel={t('delivery.account.logout')}
        tone="danger"
        onClose={() => setConfirmLogout(false)}
        onConfirm={async () => {
          if (partner.isOnline) {
            try {
              await setOnline(false);
            } catch {
              /* still log out */
            }
          }
          setConfirmLogout(false);
          await logout();
          navigate('/delivery', { replace: true });
        }}
      />
    </main>
  );
}
