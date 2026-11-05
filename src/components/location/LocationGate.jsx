import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useLocationStatus } from '../../context/LocationContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Button, Select } from '../ui/index.js';
import { LocationIcon } from '../icons/Icons.jsx';
import s from './LocationGate.module.css';

/**
 * Asks before the browser does.
 *
 * The native permission prompt gives no reason, and a prompt out of nowhere is
 * usually refused — so this screen explains first, and only calls for the
 * location once the person taps Allow.
 *
 * When the reading fails, this screen stays put and says why. It used to
 * vanish instantly: the context treated a refusal as an answer, so the person
 * landed on Home having been told nothing. Refusing is common and entirely
 * reasonable, so the village list is offered right here — which is what these
 * error messages have always promised ("pick your area below").
 */
export default function LocationGate() {
  const { check, checking, skip, setManualPlace } = useLocationStatus();
  const { settings } = useSettings();
  const [failed, setFailed] = useState(null);
  const [picking, setPicking] = useState(false);
  const [placeId, setPlaceId] = useState('');

  const places = settings.servicePlaces || [];
  // The village list is shown either because the person asked for it, or
  // because the reading failed and they need a way through regardless.
  const showPicker = picking || Boolean(failed);

  const allow = async () => {
    setFailed(null);
    try {
      await check();
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

        {failed && (
          <p className={s.failed} role="alert">
            {t(`location.errors.${failed}`)}
          </p>
        )}

        {/* The list appears once it is asked for or a reading has failed, so
            the first view stays one clear choice rather than a form. */}
        {showPicker && places.length > 0 && (
          <div className={s.manual}>
            <Select
              label={t('location.pickPlace')}
              placeholder={t('address.placePlaceholder')}
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              options={places.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Button size="lg" block disabled={!placeId} onClick={() => setManualPlace(placeId)}>
              {t('location.usePlace')}
            </Button>
          </div>
        )}

        {/* No villages configured yet: say so rather than show an empty list,
            which reads as a broken app instead of an unfinished setup. */}
        {showPicker && places.length === 0 && <p className={s.failed}>{t('location.noPlacesConfigured')}</p>}

        <div className={s.actions}>
          <Button size="lg" block loading={checking} variant={showPicker ? 'outline' : 'primary'} onClick={allow}>
            {failed ? t('common.retry') : t('location.allow')}
          </Button>
          {/* Before the list is open this reveals it, because a button that
              says "enter my area" has to lead somewhere you can do that.
              Once it is open, the remaining way out is to carry on without. */}
          <Button variant="ghost" size="lg" block onClick={showPicker ? skip : () => setPicking(true)}>
            {showPicker ? t('location.continueWithout') : t('location.enterManually')}
          </Button>
        </div>

        <p className={s.note}>{t('location.privacyNote')}</p>
      </div>
    </main>
  );
}
