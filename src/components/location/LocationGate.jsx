import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useLocationStatus } from '../../context/LocationContext.jsx';
import { Button } from '../ui/index.js';
import { LocationIcon } from '../icons/Icons.jsx';
import s from './LocationGate.module.css';

/**
 * Asks before the browser does.
 *
 * The native permission prompt gives no reason, and a prompt out of nowhere is
 * usually refused — so this screen explains first, and only calls for the
 * location once the person taps Allow.
 */
export default function LocationGate() {
  const { check, checking, skip } = useLocationStatus();
  const [failed, setFailed] = useState(null);

  const allow = async () => {
    setFailed(null);
    try {
      await check();
    } catch (e) {
      // Refused or unavailable: the app carries on, they pick their village by hand.
      setFailed(e.code || 'POSITION_UNAVAILABLE');
    }
  };

  return (
    <main className={s.page}>
      <div className={s.card}>
        <span className={s.icon} aria-hidden="true">
          <LocationIcon size={34} />
        </span>
        <h1 className={s.title}>{t('location.permissionTitle')}</h1>
        <p className={s.text}>{t('location.permissionExplain')}</p>
        {failed && (
          <p className={s.failed} role="alert">
            {t(`location.errors.${failed}`)}
          </p>
        )}
        <div className={s.actions}>
          <Button size="lg" block loading={checking} onClick={allow}>
            {t('location.allow')}
          </Button>
          <Button variant="ghost" size="lg" block onClick={skip}>
            {t('location.enterManually')}
          </Button>
        </div>
        <p className={s.note}>{t('location.privacyNote')}</p>
      </div>
    </main>
  );
}
