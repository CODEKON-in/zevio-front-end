import { useEffect, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useLocationStatus } from '../../context/LocationContext.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import InfoNote from '../ui/InfoNote.jsx';
import { CheckIcon, LocationIcon } from '../icons/Icons.jsx';
import { SERVICE_AREAS, areaById, isPlaceholder } from '../../data/serviceAreas.js';
import { PLACE_NOT_LISTED } from '../../utils/constants.js';
import { cleanPhone, isValidPhone } from '../../utils/format.js';
import { readSession, removeSession, writeSession } from '../../utils/storage.js';
import s from './AddressForm.module.css';

/** Unsaved typing, kept while the person re-detects their location. */
const DRAFT_KEY = 'zevio.addressDraft';
const LABELS = ['Home', 'Work', 'Other'];

/**
 * AddressForm — a delivery address.
 *
 * The AREA is never typed or picked here. It comes from the customer's home
 * location (the location step: GPS first, manual only after a failure) and is
 * shown as a locked chip. To use a different area they re-run that step with
 * "Not your area? Re-detect location" — there is no inline dropdown, so the
 * form cannot quietly override what the location step established.
 * Everything finer is typed: door number, street, landmark. GPS never fills
 * those in.
 *
 * Each saved address keeps its own copy of its area, so re-detecting later
 * (say, at a relative's house in Ayyampettai) adds an address there without
 * changing the ones already saved. Editing an address keeps its own area.
 *
 * Out-of-range customers (gifting mode) cannot receive deliveries, so for
 * them this form is the RECEIVER's address: they are told so, and they
 * choose the receiver's area from the areas we serve.
 *
 * Saved shape — the new fields plus the older ones other screens read:
 *   { id?, label, area: { id, name, lat, lng }, doorNumber, streetName,
 *     landmark, isDefault, name, phone, notes,
 *     placeId, door, street ("12, East Street"), detectionMethod, lat, lng }
 *
 * Props:
 *  - initial: address to edit (optional)
 *  - defaults: { name, phone } — prefilled for new addresses
 *  - onSubmit: async (address) => void
 *  - allowSkip: show "Skip for now" (post-signup, Home, Profile — true;
 *    the checkout path — false, because an order needs an address)
 *  - onSkip: () => void — required when allowSkip
 *  - onRedetect: () => void — open the location step and come back here
 *  - onNotListed: () => void — gifting mode only: "My place is not listed"
 *  - isFirst: boolean — this will be their first address (becomes the default)
 */
export default function AddressForm({ initial, defaults = {}, onSubmit, allowSkip = false, onSkip, onRedetect, onNotListed, isFirst = false }) {
  const home = useLocationStatus();
  const gifting = home.isOutOfRange;
  const editing = Boolean(initial?.id);

  // The area this address belongs to. Editing: its own. New: the home area.
  const lockedArea = editing
    ? areaById(initial.area?.id || initial.placeId)
    : areaById(home.location?.area || home.location?.place);

  const [values, setValues] = useState(() => {
    const draft = editing ? null : readSession(DRAFT_KEY, null);
    return {
      name: initial?.name ?? draft?.name ?? defaults.name ?? '',
      phone: initial?.phone ?? draft?.phone ?? defaults.phone ?? '',
      door: initial?.doorNumber ?? initial?.door ?? draft?.door ?? '',
      // Addresses saved before the street and door were split only have `street`.
      streetName: initial?.streetName ?? (initial?.door ? '' : initial?.street) ?? draft?.streetName ?? '',
      landmark: initial?.landmark ?? draft?.landmark ?? '',
      notes: initial?.notes ?? draft?.notes ?? '',
      label: initial?.label ?? draft?.label ?? 'Home',
      // Gifting mode only: the receiver's area, chosen from the served list.
      receiverArea: gifting ? initial?.placeId ?? draft?.receiverArea ?? '' : '',
    };
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // The draft has done its job once the form is back on screen.
  useEffect(() => {
    if (!editing) removeSession(DRAFT_KEY);
  }, [editing]);

  const set = (field) => (e) => {
    const value = e.target.value;
    if (field === 'receiverArea' && value === PLACE_NOT_LISTED) {
      onNotListed?.();
      return;
    }
    setValues((v) => ({ ...v, [field]: field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const redetect = () => {
    writeSession(DRAFT_KEY, values);
    onRedetect?.();
  };

  const area = gifting ? areaById(values.receiverArea) : lockedArea;

  const validate = () => {
    const er = {};
    if (!values.name.trim()) er.name = t('address.required');
    if (!isValidPhone(values.phone)) er.phone = t('address.phoneInvalid');
    if (gifting && !values.receiverArea) er.receiverArea = t('address.receiverAreaRequired');
    if (!values.door.trim()) er.door = t('address.required');
    if (!values.streetName.trim()) er.streetName = t('address.required');
    return er;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) {
      // Move focus to the first problem so the user sees it.
      e.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    if (!area) return;
    setSaving(true);
    const door = values.door.trim();
    const streetName = values.streetName.trim();
    const method = gifting ? 'manual' : editing ? initial.detectionMethod || 'manual' : home.location?.detectionMethod || 'gps';
    try {
      await onSubmit({
        ...(editing ? { id: initial.id } : {}),
        label: values.label,
        area: { id: area.id, name: area.name, lat: area.lat, lng: area.lng },
        doorNumber: door,
        streetName,
        landmark: values.landmark.trim(),
        isDefault: editing ? Boolean(initial.isDefault) : isFirst,
        name: values.name.trim(),
        phone: cleanPhone(values.phone),
        notes: values.notes.trim(),
        // Older names, still read by the order, the cart and the summaries.
        placeId: area.id,
        door,
        street: [door, streetName].filter(Boolean).join(', '),
        detectionMethod: method,
        lat: area.lat,
        lng: area.lng,
      });
    } finally {
      setSaving(false);
    }
  };

  // No home area at all (should not happen behind the location step, but the
  // form must never fall back to letting someone type one).
  if (!gifting && !lockedArea) {
    return (
      <div className={s.needLocation}>
        <span className={s.needIcon} aria-hidden="true">
          <LocationIcon size={28} />
        </span>
        <p className={s.needTitle}>{t('address.needLocation')}</p>
        <p className={s.needText}>{t('address.needLocationBody')}</p>
        <Button block iconLeft={<LocationIcon size={20} />} onClick={redetect}>
          {t('address.goToLocation')}
        </Button>
        {allowSkip && (
          <Button variant="outline" block onClick={onSkip}>
            {t('address.skip')}
          </Button>
        )}
      </div>
    );
  }

  const receiverOptions = [
    ...SERVICE_AREAS.filter((a) => !isPlaceholder(a)).map((a) => ({ value: a.id, label: a.name })),
    { value: PLACE_NOT_LISTED, label: t('address.notListed') },
  ];

  return (
    <form className={s.form} onSubmit={handleSubmit} noValidate>
      {gifting ? (
        <>
          <InfoNote tone="warning">{t('address.outOfRangeNote')}</InfoNote>
          <Select
            label={t('address.receiverAreaLabel')}
            required
            placeholder={t('address.placePlaceholder')}
            options={receiverOptions}
            value={values.receiverArea}
            onChange={set('receiverArea')}
            error={errors.receiverArea}
          />
        </>
      ) : (
        <div className={s.areaBlock}>
          <span className={s.areaLabel} id="address-area-label">
            {t('address.areaLabel')}
          </span>
          {/* Locked: not a field, not a button — just the area. */}
          <div className={s.areaChip} role="group" aria-labelledby="address-area-label" aria-describedby="address-area-note">
            <LocationIcon size={18} />
            <span className={s.chipText}>{lockedArea.name}</span>
            <CheckIcon size={16} className={s.chipCheck} />
          </div>
          <p id="address-area-note" className={s.areaNote}>
            {editing ? t('address.areaLockedEdit') : t('address.areaLocked')}
          </p>
          {!editing && onRedetect && (
            <button type="button" className={s.redetect} onClick={redetect}>
              {t('address.redetect')}
            </button>
          )}
        </div>
      )}

      <Input
        label={t('address.doorLabel')}
        required
        placeholder={t('address.doorPlaceholder')}
        value={values.door}
        onChange={set('door')}
        error={errors.door}
        autoComplete="address-line1"
      />
      <Input
        label={t('address.streetNameLabel')}
        required
        placeholder={t('address.streetNamePlaceholder')}
        value={values.streetName}
        onChange={set('streetName')}
        error={errors.streetName}
        autoComplete="address-line2"
      />
      <Input
        label={`${t('address.landmarkLabel')} (${t('common.optional')})`}
        placeholder={t('address.landmarkPlaceholder')}
        value={values.landmark}
        onChange={set('landmark')}
      />

      <fieldset className={s.labels}>
        <legend className={s.areaLabel}>
          {t('address.labelTitle')} <span className={s.optional}>({t('common.optional')})</span>
        </legend>
        <div className={s.labelRow}>
          {LABELS.map((l) => (
            <button
              key={l}
              type="button"
              className={`${s.labelChip} ${values.label === l ? s.labelActive : ''}`}
              aria-pressed={values.label === l}
              onClick={() => setValues((v) => ({ ...v, label: l }))}
            >
              {t(`address.labels.${l}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Who receives it. Prefilled with their own details; for a gift order
          these are the receiver's. */}
      <div className={s.contact}>
        <p className={s.areaLabel}>{gifting ? t('address.receiverTitle') : t('address.contactTitle')}</p>
        <Input label={t('address.nameLabel')} required value={values.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <Input
          label={t('address.phoneLabel')}
          required
          prefix="+91"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={values.phone}
          onChange={set('phone')}
          error={errors.phone}
        />
        <Input
          label={`${t('address.notesLabel')} (${t('common.optional')})`}
          placeholder={t('address.notesPlaceholder')}
          multiline
          rows={2}
          value={values.notes}
          onChange={set('notes')}
        />
      </div>

      <div className={s.actions}>
        <Button type="submit" size="lg" block loading={saving}>
          {t('address.save')}
        </Button>
        {allowSkip && (
          <Button type="button" variant="outline" size="lg" block onClick={onSkip} disabled={saving}>
            {t('address.skip')}
          </Button>
        )}
      </div>
    </form>
  );
}
