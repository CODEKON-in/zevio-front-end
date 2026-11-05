import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import UseMyLocationButton from '../location/UseMyLocationButton.jsx';
import { PLACE_NOT_LISTED } from '../../utils/constants.js';
import { cleanPhone, isValidPhone } from '../../utils/format.js';
import s from './AddressForm.module.css';

/**
 * AddressForm — Name, Phone, Place (service-area dropdown), Street/House, Landmark (required), Notes.
 *
 * "Use my location" fills in the village only. The door number, street,
 * landmark and notes are always typed by the person: GPS cannot know them, and
 * a guessed address is a failed delivery.
 * Props:
 *  - initial: address object to edit (optional)
 *  - defaults: { name, phone } — prefilled for new addresses
 *  - onSubmit: async (address) => void
 *  - onNotListed: () => void — user picked "My place is not listed"
 */
export default function AddressForm({ initial, defaults = {}, onSubmit, onNotListed }) {
  const { settings } = useSettings();
  const [values, setValues] = useState({
    name: initial?.name ?? defaults.name ?? '',
    phone: initial?.phone ?? defaults.phone ?? '',
    placeId: initial?.placeId ?? '',
    street: initial?.street ?? '',
    landmark: initial?.landmark ?? '',
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [outOfArea, setOutOfArea] = useState(false);

  const set = (field) => (e) => {
    const value = e.target.value;
    if (field === 'placeId' && value === PLACE_NOT_LISTED) {
      onNotListed?.();
      return;
    }
    setValues((v) => ({ ...v, [field]: field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!values.name.trim()) er.name = t('address.required');
    if (!isValidPhone(values.phone)) er.phone = t('address.phoneInvalid');
    if (!values.placeId) er.placeId = t('address.required');
    if (!values.street.trim()) er.street = t('address.required');
    if (!values.landmark.trim()) er.landmark = t('address.landmarkRequired');
    return er;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) {
      // Move focus to the first problem so the user sees it.
      const first = e.currentTarget.querySelector('[aria-invalid="true"]');
      first?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...(initial?.id ? { id: initial.id } : {}),
        name: values.name.trim(),
        phone: cleanPhone(values.phone),
        placeId: values.placeId,
        street: values.street.trim(),
        landmark: values.landmark.trim(),
        notes: values.notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  const placeOptions = [
    ...settings.servicePlaces.map((p) => ({ value: p.id, label: p.name })),
    { value: PLACE_NOT_LISTED, label: t('address.notListed') },
  ];

  // With no villages set up, the only choice is "not listed", and Place is
  // required — so no address can be saved and no order can be placed. That is
  // a setup problem, not something the customer can solve by trying again, so
  // it says so instead of presenting an empty dropdown that looks broken.
  const noPlaces = settings.servicePlaces.length === 0;

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
      <UseMyLocationButton
        onDetected={({ place }) => {
          setOutOfArea(false);
          // Only the village is filled in; everything else stays as typed.
          setValues((v) => ({ ...v, placeId: settings.servicePlaces.some((pl) => pl.id === place) ? place : v.placeId }));
          setErrors((er) => ({ ...er, placeId: undefined }));
        }}
        onOutOfArea={() => {
          setOutOfArea(true);
          setValues((v) => ({ ...v, placeId: '' }));
        }}
      />
      {outOfArea && (
        <p className={s.outOfArea} role="alert">
          {t('location.outOfRangeAddress')}
        </p>
      )}
      {noPlaces && (
        <p className={s.outOfArea} role="alert">
          {t('location.noPlacesConfigured')}
        </p>
      )}
      <Select
        label={t('address.placeLabel')}
        required
        placeholder={t('address.placePlaceholder')}
        options={placeOptions}
        value={values.placeId}
        onChange={set('placeId')}
        error={errors.placeId}
      />
      <Input
        label={t('address.streetLabel')}
        required
        placeholder={t('address.streetPlaceholder')}
        value={values.street}
        onChange={set('street')}
        error={errors.street}
        autoComplete="street-address"
      />
      <Input
        label={t('address.landmarkLabel')}
        required
        hint={t('address.landmarkHint')}
        value={values.landmark}
        onChange={set('landmark')}
        error={errors.landmark}
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
