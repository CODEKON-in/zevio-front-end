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
 *
 * Finding the position properly takes a few seconds: the phone offers a rough
 * network fix immediately and tightens it as satellites come in. Rather than
 * look frozen, the screen shows the fix improving, which is also the honest
 * signal that going outside or to a window will help.
 *
 * There is no "type in your village" here by design. A village chosen by hand
 * is a claim the app cannot check, and it is the delivery address — entered
 * later, where it belongs — that actually decides where an order goes.
 */
export default function LocationGate() {
  const { check, checking, skip } = useLocationStatus();
  const [failed, setFailed] = useState(null);
  const [accuracy, setAccuracy] = useState(null);

  const allow = async () => {
    setFailed(null);
    setAccuracy(null);
    try {
      await check((reading) => setAccuracy(reading.accuracy));
    } catch (e) {
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

        {checking && (
          <p className={s.progress} role="status">
            {accuracy
              ? t('location.refining', { m: Math.round(accuracy) })
              : t('location.searching')}
          </p>
        )}

        {failed && !checking && (
          <p className={s.failed} role="alert">
            {t(`location.errors.${failed}`)}
          </p>
        )}

        <div className={s.actions}>
          <Button size="lg" block loading={checking} onClick={allow}>
            {failed ? t('common.retry') : t('location.allow')}
          </Button>
          {/* Not a way to set a location by hand — a way not to be trapped on
              this screen when the phone genuinely cannot produce one. */}
          {failed && (
            <Button variant="ghost" size="lg" block onClick={skip}>
              {t('location.continueWithout')}
            </Button>
          )}
        </div>

        {failed && <p className={s.tip}>{t('location.accuracyTip')}</p>}
        <p className={s.note}>{t('location.privacyNote')}</p>
      </div>
    </main>
  );
}
