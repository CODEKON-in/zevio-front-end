import { useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import Button from '../ui/Button.jsx';
import { LocationIcon } from '../icons/Icons.jsx';
import { detectArea, deviceKind, getCurrentPosition } from '../../utils/geolocation.js';
import s from './UseMyLocationButton.module.css';

const IS_DEV = Boolean(import.meta.env?.DEV);

/**
 * "Use my location" — works out which of our areas the customer is in.
 *
 * It finds the area only. The street, door number and landmark are always
 * typed by the person: GPS gives a point, not an address, and a guessed door
 * number means a lost order.
 *
 * Props:
 *  - onDetected({ area, reading }) — the reading puts them inside one of our areas
 *  - onOutOfRange({ nearestArea, distanceKm, reading }) — outside all of them
 *  - onFailed(code) — no usable reading; the form should offer the dropdown
 *  - onReading(reading) — every reading taken, for the form's dev debug box
 *
 * States: idle → loading ("Finding your area…", disabled) → one of: detected
 * (the form shows the area chip), out of range, too rough, or an error. Every
 * outcome other than detected leaves the dropdown available, so this is never
 * a dead end.
 */
export default function UseMyLocationButton({ onDetected, onOutOfRange, onFailed, onReading }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { text, retry }
  // State updates land on the next render, so two quick taps could both start a
  // request before `busy` is seen. A ref is read synchronously and stops that.
  const inFlight = useRef(false);

  const fail = (text, code) => {
    setMessage({ text, retry: true });
    onFailed?.(code);
  };

  const run = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const reading = await getCurrentPosition();
      onReading?.(reading);
      const result = detectArea(reading);

      if (result.status === 'IN_AREA') {
        onDetected?.({ area: result.area, reading });
        return;
      }
      if (result.status === 'OUT_OF_RANGE') {
        setMessage({
          text: result.nearestArea
            ? t('location.outOfRangeNearest', { area: result.nearestArea.name, km: result.distanceKm.toFixed(1) })
            : t('location.outOfRangeAddress'),
          retry: true,
        });
        onOutOfRange?.({ nearestArea: result.nearestArea, distanceKm: result.distanceKm, reading });
        return;
      }
      // LOW_ACCURACY. On a computer, say why, because "move to an open area"
      // will never help a laptop that has no GPS.
      fail(
        deviceKind() === 'computer' ? t('location.lowAccuracyComputer') : t('location.lowAccuracy'),
        'LOW_ACCURACY',
      );
    } catch (e) {
      const code = e?.code || 'POSITION_UNAVAILABLE';
      if (code === 'PERMISSION_DENIED') fail(t('location.blocked'), code);
      else if (code === 'INSECURE_CONTEXT' && IS_DEV) fail(t('location.insecureDev'), code);
      else fail(t('location.couldNotGet'), code);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className={s.wrap}>
      <Button
        type="button"
        variant="outline"
        block
        loading={busy}
        disabled={busy}
        iconLeft={<LocationIcon size={18} />}
        onClick={run}
      >
        {busy ? t('location.findingArea') : t('location.useMyLocation')}
      </Button>

      {message && (
        <div className={s.message} role="status">
          <p className={`${s.text} ${s.warn}`}>{message.text}</p>
          {message.retry && (
            <Button type="button" variant="ghost" size="sm" onClick={run} disabled={busy}>
              {t('common.retry')}
            </Button>
          )}
        </div>
      )}

    </div>
  );
}
