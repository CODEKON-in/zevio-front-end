import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import Button from '../ui/Button.jsx';
import { LocationIcon } from '../icons/Icons.jsx';
import { deviceKind, locate } from '../../utils/geolocation.js';
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
/** "pandaravadai" → "Pandaravadai": a slug is an id, not something to show. */
const titleCase = (slug) =>
  String(slug || '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export default function UseMyLocationButton({ onDetected, onOutOfArea }) {
  const { getPlace } = useSettings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { tone, text }

  const run = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const reading = await locate();
      // Too vague to decide: say the reading was poor rather than announcing
      // a conclusion it cannot support. Someone standing in the village gets
      // told the signal was weak, not that we refuse to deliver to them.
      if (reading.verdict === 'unsure') {
        const km = Math.round(reading.accuracy / 1000);
        setMessage({
          tone: 'warn',
          text: deviceKind() === 'computer' ? t('location.tooVagueComputer', { km }) : t('location.tooVague', { km }),
        });
        return;
      }
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
      // The village came from the app's own map of the corridor; the form can
      // only offer the villages the admin has set up. When those disagree the
      // form silently keeps its old value, so claiming success here left the
      // person looking at "Detected: X" above an empty, required field.
      const known = getPlace(reading.place);
      if (!known) {
        setMessage({
          tone: 'warn',
          text: t('location.detectedNotServed', { place: titleCase(reading.place) }),
        });
        return;
      }
      onDetected?.(reading);
      setMessage({ tone: 'ok', text: t('location.detected', { place: known.name }) });
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
