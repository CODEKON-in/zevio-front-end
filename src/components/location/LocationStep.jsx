import { useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useLocationStatus } from '../../context/LocationContext.jsx';
import { Button, InfoNote } from '../ui/index.js';
import SuccessTick from '../ui/SuccessTick.jsx';
import MyntIcon from '../brand/MyntIcon.jsx';
import { CheckIcon, InfoIcon, LocationIcon, SearchIcon } from '../icons/Icons.jsx';
import { deviceKind } from '../../utils/geolocation.js';
import { SERVICE_AREAS, isPlaceholder } from '../../data/serviceAreas.js';
import s from './LocationStep.module.css';

const IS_DEV = Boolean(import.meta.env?.DEV);
/** Show a search box over the area list once it is this long. */
const SEARCH_FROM = 8;

/** Errors where trying GPS again cannot help, so the area list opens at once. */
const NO_RETRY = new Set(['UNSUPPORTED']);

/**
 * The location step — right after sign-up, before Home, and again from
 * Profile when someone updates their area.
 *
 * GPS first, always. The screen opens with one action, "Use my location".
 * Picking an area by hand is a fallback, not an equal choice: the area list
 * is not rendered at all until a GPS attempt has failed (refused, no fix,
 * too slow, too rough, unsupported). There is no skip.
 *
 * Its only job is the customer's home area and whether we deliver there.
 * The street, door number and landmark are asked for later, in the address
 * form, when they actually order.
 *
 * States:
 *   idle → detecting → in      (we deliver: Continue)
 *                    → out     (outside: Continue in gifting mode, or Try again)
 *                    → failed  (message, Try again, and "choose manually")
 *   failed → manual  (pick an area → Continue; or "order for someone else" → elsewhere)
 *
 * Props:
 *  - onDone(result) — after Continue saved the location. On sign-up the app
 *    then offers the address page (in range) or goes Home; from Profile or
 *    the address form it goes back where it came from.
 *  - onCancel() — optional; only the Profile route offers it, because the
 *    person already has a saved area there
 */
export default function LocationStep({ onDone, onCancel }) {
  const { detect, manualResult, elsewhereResult, confirm } = useLocationStatus();
  const [view, setView] = useState('idle'); // idle | detecting | in | out | elsewhere | failed
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  // The manual list exists only after a failure. `manualUnlocked` records
  // that a failure happened; `manualOpen` that they asked for the list.
  const [manualUnlocked, setManualUnlocked] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const busy = useRef(false);

  const fail = (code) => {
    setError(code);
    setView('failed');
    setManualUnlocked(true);
    if (code === 'INSECURE_CONTEXT') {
      // eslint-disable-next-line no-console
      console.warn('[Mynt] Location needs HTTPS (or localhost). Choose an area manually to keep testing.');
    }
    // No point offering "try again": open the list straight away.
    if (NO_RETRY.has(code) || (code === 'INSECURE_CONTEXT' && IS_DEV)) setManualOpen(true);
  };

  const run = async () => {
    // A ref, not state: two quick taps both see it before a re-render.
    if (busy.current) return;
    busy.current = true;
    setView('detecting');
    setError(null);
    try {
      const r = await detect();
      setResult(r);
      setView(r.status === 'in_range' ? 'in' : 'out');
    } catch (e) {
      fail(e?.code || 'POSITION_UNAVAILABLE');
    } finally {
      busy.current = false;
    }
  };

  const finish = (r) => {
    confirm(r);
    onDone?.(r);
  };

  const detecting = view === 'detecting';

  return (
    <main className={s.page}>
      <div className={s.card}>
        {view === 'in' && result ? (
          <InRange result={result} onContinue={() => finish(result)} />
        ) : view === 'out' && result ? (
          <OutOfRange result={result} onContinue={() => finish(result)} onRetry={run} />
        ) : view === 'elsewhere' ? (
          <OutOfRange result={null} onContinue={() => finish(elsewhereResult())} onRetry={run} />
        ) : (
          <>
            <MyntIcon size={56} className={s.mark} />
            <h1 className={s.title}>{onCancel ? t('location.step.updateTitle') : t('location.step.title')}</h1>
            <p className={s.text}>{t('location.step.subtitle')}</p>

            {view === 'failed' && error && <FailureMessage code={error} />}

            {!manualOpen && (
              <div className={s.actions}>
                {!(view === 'failed' && NO_RETRY.has(error)) && (
                  <Button size="lg" block loading={detecting} disabled={detecting} iconLeft={<LocationIcon size={22} />} onClick={run}>
                    {detecting ? t('location.step.detecting') : view === 'failed' ? t('common.retry') : t('location.useMyLocation')}
                  </Button>
                )}
                {detecting && (
                  <p className={s.reassure} role="status">
                    {t('location.step.fewSeconds')}
                  </p>
                )}
              </div>
            )}

            {/* The fallback link: rendered only once an attempt has failed. */}
            {manualUnlocked && !manualOpen && !detecting && (
              <button type="button" className={s.link} onClick={() => setManualOpen(true)}>
                {error === 'TOO_VAGUE' || error === 'PERMISSION_DENIED' ? t('location.step.orManual') : t('location.step.chooseManual')}
              </button>
            )}

            {/* The area list itself: not in the page at all before a failure. */}
            {manualUnlocked && manualOpen && (
              <ManualPicker
                onPick={(area) => finish(manualResult(area))}
                onElsewhere={() => setView('elsewhere')}
                onRetry={NO_RETRY.has(error) ? null : () => {
                  setManualOpen(false);
                  run();
                }}
              />
            )}

            {view === 'failed' && !manualOpen && (
              <p className={s.tip}>{deviceKind() === 'computer' ? t('location.accuracyTipComputer') : t('location.accuracyTip')}</p>
            )}
          </>
        )}

        {onCancel && !detecting && (
          <button type="button" className={`${s.link} ${s.cancel}`} onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
        <p className={s.note}>{t('location.privacyNote')}</p>
      </div>
    </main>
  );
}

/** State C — we deliver there. */
function InRange({ result, onContinue }) {
  return (
    <div className={s.result}>
      <SuccessTick size={112} className={s.tick} />
      <h1 className={s.detected}>
        <LocationIcon size={24} />
        {t('location.step.detected', { area: result.area.name })}
      </h1>
      <p className={s.text}>{t('location.step.weDeliver', { area: result.area.name })}</p>
      <div className={s.actions}>
        <Button size="lg" block onClick={onContinue}>
          {t('common.continue')}
        </Button>
      </div>
    </div>
  );
}

/**
 * State D — outside the area. A normal, supported case (they can order for
 * someone inside it), so the icon is informational rather than an error.
 * `result` is null when they said so by hand after GPS failed.
 */
function OutOfRange({ result, onContinue, onRetry }) {
  const nearest = result?.nearestArea;
  return (
    <div className={s.result}>
      <span className={s.infoIcon} aria-hidden="true">
        <InfoIcon size={40} />
      </span>
      <h1 className={s.detected}>
        <LocationIcon size={24} />
        {t('location.step.yourLocation')}
      </h1>
      <p className={s.text}>
        {nearest
          ? t('location.step.outNearest', { area: nearest.name, km: result.distanceKm.toFixed(1) })
          : t('location.step.outGeneric')}
      </p>
      <InfoNote tone="info" className={s.canDo}>
        {t('location.step.canStillOrder')}
      </InfoNote>
      <div className={s.actions}>
        <Button size="lg" block onClick={onContinue}>
          {t('common.continue')}
        </Button>
        <Button variant="outline" size="lg" block iconLeft={<LocationIcon size={20} />} onClick={onRetry}>
          {t('location.step.tryAgain')}
        </Button>
      </div>
    </div>
  );
}

/** States E, G, H — what went wrong, in plain words. */
function FailureMessage({ code }) {
  const lines = {
    TOO_VAGUE: [t('location.step.errors.TOO_VAGUE')],
    PERMISSION_DENIED: [t('location.step.errors.PERMISSION_DENIED'), t('location.step.errors.PERMISSION_DENIED_HELP')],
    TIMEOUT: [t('location.step.errors.TIMEOUT')],
    POSITION_UNAVAILABLE: [t('location.step.errors.POSITION_UNAVAILABLE')],
    UNSUPPORTED: [t('location.step.errors.UNSUPPORTED')],
    INSECURE_CONTEXT: [t('location.step.errors.INSECURE_CONTEXT')],
  }[code] || [t('location.step.errors.POSITION_UNAVAILABLE')];
  return (
    <div className={s.failed} role="alert">
      <strong>{lines[0]}</strong>
      {lines[1] && <span>{lines[1]}</span>}
    </div>
  );
}

/** State F — choose an area by hand. Only ever rendered after a failure. */
function ManualPicker({ onPick, onElsewhere, onRetry }) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const areas = useMemo(
    () => SERVICE_AREAS.filter((a) => !isPlaceholder(a)).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const q = query.trim().toLowerCase();
  const shown = q ? areas.filter((a) => a.name.toLowerCase().includes(q)) : areas;

  return (
    <section className={s.manual} aria-labelledby="manual-title">
      <h2 id="manual-title" className={s.manualTitle}>
        {t('location.step.manualTitle')}
      </h2>
      {areas.length > SEARCH_FROM && (
        <label className={s.search}>
          <SearchIcon size={18} />
          <span className="visually-hidden">{t('location.step.searchArea')}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('location.step.searchArea')} />
        </label>
      )}
      <ul className={s.areaList} role="radiogroup" aria-labelledby="manual-title">
        {shown.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              role="radio"
              aria-checked={picked?.id === a.id}
              className={`${s.area} ${picked?.id === a.id ? s.areaPicked : ''}`}
              onClick={() => setPicked(a)}
            >
              <LocationIcon size={18} />
              <span>{a.name}</span>
              {picked?.id === a.id && <CheckIcon size={18} className={s.areaCheck} />}
            </button>
          </li>
        ))}
        {!shown.length && <li className={s.noMatch}>{t('location.step.noMatch')}</li>}
      </ul>
      <div className={s.actions}>
        <Button size="lg" block disabled={!picked} onClick={() => picked && onPick(picked)}>
          {t('common.continue')}
        </Button>
        {onRetry && (
          <Button variant="ghost" block iconLeft={<LocationIcon size={18} />} onClick={onRetry}>
            {t('location.step.tryGpsAgain')}
          </Button>
        )}
      </div>
      <button type="button" className={s.link} onClick={onElsewhere}>
        {t('location.step.elsewhere')}
      </button>
    </section>
  );
}
