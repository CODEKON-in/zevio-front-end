import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import Button from '../ui/Button.jsx';
import { LocationIcon } from '../icons/Icons.jsx';
import { locate } from '../../utils/geolocation.js';
import s from './UseMyLocationButton.module.css';

/**
 * "Use my location" — fills in the village only.
 *
 * Door number, street, landmark and notes are never guessed from GPS: a reading
 * is accurate to a street at best, and a wrong door number means a lost order.
 *
 * Props:
 *  - onDetected({ place, lat, lng, inServiceArea }) — a village we serve was recognised
 *  - onOutOfArea(reading) — the reading is outside the delivery area
 */
export default function UseMyLocationButton({ onDetected, onOutOfArea }) {
  const { getPlace } = useSettings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { tone, text }

  const run = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const reading = await locate();
      if (!reading.inServiceArea) {
        setMessage({ tone: 'warn', text: t('location.outOfRangeAddress') });
        onOutOfArea?.(reading);
        return;
      }
      if (!reading.place) {
        // Inside the area but not near enough to a village to be sure.
        setMessage({ tone: 'warn', text: t('location.notDetected') });
        return;
      }
      onDetected?.(reading);
      setMessage({ tone: 'ok', text: t('location.detected', { place: getPlace(reading.place)?.name || reading.place }) });
    } catch (e) {
      setMessage({ tone: 'warn', text: t(`location.errors.${e.code || 'POSITION_UNAVAILABLE'}`) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.wrap}>
      <Button type="button" variant="outline" block loading={busy} iconLeft={<LocationIcon size={18} />} onClick={run}>
        {busy ? t('location.detecting') : t('location.useMyLocation')}
      </Button>
      {message && (
        <p className={`${s.message} ${message.tone === 'ok' ? s.ok : s.warn}`} role="status">
          {message.text}
          {message.tone === 'warn' && (
            <button type="button" className={s.retry} onClick={run}>
              {t('common.retry')}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
