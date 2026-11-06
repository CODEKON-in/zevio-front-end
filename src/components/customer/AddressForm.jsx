import { useState } from 'react';
import { t } from '../../i18n/index.js';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import UseMyLocationButton from '../location/UseMyLocationButton.jsx';
import LocationDebug from '../location/LocationDebug.jsx';
import { CheckIcon, LocationIcon } from '../icons/Icons.jsx';
import { SERVICE_AREAS, areaById } from '../../data/serviceAreas.js';
import { PLACE_NOT_LISTED } from '../../utils/constants.js';
import { cleanPhone, isValidPhone } from '../../utils/format.js';
import s from './AddressForm.module.css';

const IS_DEV = import.meta.env.DEV;

/**
 * AddressForm — Name, Phone, Area, Street, Door number, Landmark, Notes.
 *
 * The area comes from "Use my location" or from the dropdown. Everything else
 * is typed: GPS gives a point, not an address, and a guessed door number is a
 * failed delivery.
 *
 * A manual choice always overrides GPS — near a border the reading can pick the
 * wrong village, and the person knows where they live. When GPS says they are
 * outside our areas the area is left empty, so the address cannot be saved
 * until they pick one we serve.
 *
 * The saved address keeps `street` as the single line every other screen and
 * the order itself read ("12, East Street"), with the two parts alongside it,
 * plus lat, lng and accuracy when the area came from GPS, and how it was set.
 *
 * Props:
 *  - initial: address object to edit (optional)
 *  - defaults: { name, phone } — prefilled for new addresses
 *  - onSubmit: async (address) => void
 *  - onNotListed: () => void — user picked "My place is not listed"
 */
export default function AddressForm({ initial, defaults = {}, onSubmit, onNotListed }) {
  const [values, setValues] = useState({
    name: initial?.name ?? defaults.name ?? '',
    phone: initial?.phone ?? defaults.phone ?? '',
    placeId: initial?.placeId ?? '',
    // Addresses saved before the street and door were split only have `street`.
    streetName: initial?.streetName ?? (initial?.door ? '' : initial?.street ?? ''),
    door: initial?.door ?? '',
    landmark: initial?.landmark ?? '',
    notes: initial?.notes ?? '',
  });
  const [detection, setDetection] = useState(() => ({
    method: initial?.detectionMethod ?? (initial?.placeId ? 'manual' : null),
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
    accuracy: initial?.accuracy ?? null,
  }));
  // The dropdown shows when no area is set yet, or when they tap "Change".
  const [picking, setPicking] = useState(!initial?.placeId);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastReading, setLastReading] = useState(null); // dev debug box only

  const set = (field) => (e) => {
    const value = e.target.value;
    if (field === 'placeId') {
      if (value === PLACE_NOT_LISTED) {
        onNotListed?.();
        return;
      }
      // Picking by hand overrides whatever GPS said, and its coordinates no
      // longer describe this address.
      setDetection({ method: value ? 'manual' : null, lat: null, lng: null, accuracy: null });
      if (value) setPicking(false);
    }
    setValues((v) => ({ ...v, [field]: field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onDetected = ({ area, reading }) => {
    setValues((v) => ({ ...v, placeId: area.id }));
    setDetection({ method: 'gps', lat: reading.lat, lng: reading.lng, accuracy: reading.accuracy });
    setPicking(false);
    setErrors((er) => ({ ...er, placeId: undefined }));
  };

  const onOutOfRange = () => {
    // Not one of ours: clear the area, so this address cannot be saved for
    // delivery unless they pick an area we serve themselves.
    setValues((v) => ({ ...v, placeId: '' }));
    setDetection({ method: null, lat: null, lng: null, accuracy: null });
    setPicking(true);
  };

  const onFailed = () => setPicking(true);

  const validate = () => {
    const er = {};
    if (!values.name.trim()) er.name = t('address.required');
    if (!isValidPhone(values.phone)) er.phone = t('address.phoneInvalid');
    if (!values.placeId) er.placeId = t('address.areaRequired');
    if (!values.streetName.trim()) er.streetName = t('address.required');
    if (!values.door.trim()) er.door = t('address.required');
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
    setSaving(true);
    const door = values.door.trim();
    const streetName = values.streetName.trim();
    try {
      await onSubmit({
        ...(initial?.id ? { id: initial.id } : {}),
        name: values.name.trim(),
        phone: cleanPhone(values.phone),
        placeId: values.placeId,
        door,
        streetName,
        street: [door, streetName].filter(Boolean).join(', '),
        landmark: values.landmark.trim(),
        notes: values.notes.trim(),
        detectionMethod: detection.method || 'manual',
        lat: detection.method === 'gps' ? detection.lat : null,
        lng: detection.method === 'gps' ? detection.lng : null,
        accuracy: detection.method === 'gps' ? detection.accuracy : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const area = areaById(values.placeId);
  const areaOptions = [
    ...SERVICE_AREAS.map((a) => ({ value: a.id, label: a.name })),
    { value: PLACE_NOT_LISTED, label: t('address.notListed') },
  ];

  return (
    <form className={s.form} onSubmit={handleSubmit} noValidate>
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

      <div className={s.areaBlock}>
        <span className={s.areaLabel} id="address-area-label">
          {t('address.areaLabel')} <span className={s.required} aria-hidden="true">*</span>
        </span>

        {area && !picking ? (
          <div className={s.areaChip} aria-labelledby="address-area-label">
            <span className={s.chipText}>
              <LocationIcon size={18} />
              {detection.method === 'gps' ? t('address.areaDetected', { area: area.name }) : area.name}
              {detection.method === 'gps' && <CheckIcon size={16} />}
            </span>
            <button type="button" className={s.change} onClick={() => setPicking(true)}>
              {t('address.changeArea')}
            </button>
          </div>
        ) : (
          <>
            <UseMyLocationButton onDetected={onDetected} onOutOfRange={onOutOfRange} onFailed={onFailed} onReading={setLastReading} />
            <Select
              label={t('address.pickAreaLabel')}
              placeholder={t('address.placePlaceholder')}
              options={areaOptions}
              value={values.placeId}
              onChange={set('placeId')}
              error={errors.placeId}
            />
          </>
        )}
        {errors.placeId && area && !picking && <p className={s.error}>{errors.placeId}</p>}
        {IS_DEV && <LocationDebug reading={lastReading} />}
      </div>

      <Input
        label={t('address.streetNameLabel')}
        required
        placeholder={t('address.streetNamePlaceholder')}
        value={values.streetName}
        onChange={set('streetName')}
        error={errors.streetName}
        autoComplete="address-line1"
      />
      <Input
        label={t('address.doorLabel')}
        required
        placeholder={t('address.doorPlaceholder')}
        value={values.door}
        onChange={set('door')}
        error={errors.door}
        autoComplete="address-line2"
      />
      <Input
        label={`${t('address.landmarkLabel')} (${t('common.optional')})`}
        hint={t('address.landmarkHint')}
        value={values.landmark}
        onChange={set('landmark')}
      />
      <Input
        label={`${t('address.notesLabel')} (${t('common.optional')})`}
        placeholder={t('address.notesPlaceholder')}
        multiline
        rows={2}
        value={values.notes}
        onChange={set('notes')}
      />
      <Button type="submit" size="lg" block loading={saving}>
        {t('address.save')}
      </Button>
    </form>
  );
}
