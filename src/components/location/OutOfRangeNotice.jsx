import { t } from '../../i18n/index.js';
import { useLocationStatus } from '../../context/LocationContext.jsx';
import { Button } from '../ui/index.js';
import { AlertIcon } from '../icons/Icons.jsx';
import { deviceKind } from '../../utils/geolocation.js';
import s from './OutOfRangeNotice.module.css';

/**
 * Shown full-screen when the phone places the customer outside the delivery
 * area. Unmissable on purpose, but not a dead end: they can browse, and they
 * can order for someone who does live inside the area.
 *
 * There is no "pick my village instead" here. It let anyone declare
 * themselves inside the area, which is not something the app can check, and
 * it made the reading pointless. If the reading is wrong, the honest remedy
 * is to take another one outdoors — so the screen shows what the phone
 * actually reported and offers to try again.
 */
export default function OutOfRangeNotice() {
  const { acknowledge, check, checking, location } = useLocationStatus();

  return (
    <main className={s.page}>
      <div className={s.card}>
        <span className={s.icon} aria-hidden="true">
          <AlertIcon size={34} />
        </span>
        <h1 className={s.title}>{t('location.outOfRange.title')}</h1>
        <p className={s.text}>{t('location.outOfRange.body')}</p>

        {/* What the phone actually reported. Without this, someone standing in
            their own village has no way to tell a genuine refusal from a bad
            reading, and no way to tell anyone else what went wrong. */}
        {location && (
          <p className={s.reading}>
            {t('location.outOfRange.reading', {
              lat: location.lat?.toFixed(4),
              lng: location.lng?.toFixed(4),
              km: Math.round(location.distanceKm ?? 0),
              accuracy: Math.round((location.accuracy ?? 0) / 100) / 10,
            })}
          </p>
        )}

        <div className={s.actions}>
          <Button size="lg" block onClick={acknowledge}>
            {t('location.outOfRange.sendToFriend')}
          </Button>
          <Button variant="outline" size="lg" block onClick={acknowledge}>
            {t('location.outOfRange.browse')}
          </Button>
          <Button variant="ghost" size="lg" block loading={checking} onClick={() => check().catch(() => {})}>
            {t('location.outOfRange.recheck')}
          </Button>
        </div>

        <p className={s.tip}>
          {deviceKind() === 'computer' ? t('location.accuracyTipComputer') : t('location.accuracyTip')}
        </p>
      </div>
    </main>
  );
}
