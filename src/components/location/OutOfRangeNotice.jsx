import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useLocationStatus } from '../../context/LocationContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Button, Select } from '../ui/index.js';
import { AlertIcon } from '../icons/Icons.jsx';
import s from './OutOfRangeNotice.module.css';

/**
 * Shown full-screen when the phone says the customer is outside the delivery
 * area. Unmissable on purpose — but never a dead end: they can browse, order
 * for someone who is inside the area, or say the reading is wrong and pick
 * their village by hand (GPS is often poor indoors).
 */
export default function OutOfRangeNotice() {
  const { acknowledge, setManualPlace, location } = useLocationStatus();
  const { settings } = useSettings();
  const [picking, setPicking] = useState(false);
  const [placeId, setPlaceId] = useState('');

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

        {!picking ? (
          <>
            <div className={s.actions}>
              <Button size="lg" block onClick={acknowledge}>
                {t('location.outOfRange.sendToFriend')}
              </Button>
              <Button variant="outline" size="lg" block onClick={acknowledge}>
                {t('location.outOfRange.browse')}
              </Button>
            </div>
            <button type="button" className={s.link} onClick={() => setPicking(true)}>
              {t('location.outOfRange.wrong')}
            </button>
          </>
        ) : (
          <div className={s.manual}>
            <Select
              label={t('location.outOfRange.pickPlace')}
              placeholder={t('address.placePlaceholder')}
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              options={settings.servicePlaces.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Button size="lg" block disabled={!placeId} onClick={() => setManualPlace(placeId)}>
              {t('location.outOfRange.usePlace')}
            </Button>
            <button type="button" className={s.link} onClick={() => setPicking(false)}>
              {t('common.back')}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
