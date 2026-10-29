import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getShops } from '../../services/shopService.js';
import { Button, Card, ErrorState, Input, SkeletonList } from '../../components/ui/index.js';
import { PlusIcon, TrashIcon } from '../../components/icons/Icons.jsx';
import { cleanPhone, isValidPhone } from '../../utils/format.js';
import a from './admin.module.css';
import s from './AdminSettings.module.css';

const UPI_PATTERN = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;
const slug = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Admin settings: fees, support contacts, platform UPI, service-area places. */
export default function AdminSettings() {
  const { settings, status, reload, updateSettings } = useSettings();
  const { showToast } = useToast();
  const shops = useAsync(() => getShops({ includeInactive: true }), []);
  const [values, setValues] = useState(null);
  const [places, setPlaces] = useState([]);
  const [newPlace, setNewPlace] = useState('');
  const [placeError, setPlaceError] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (status === 'ready' && !values) {
      setValues({
        deliveryFee: String(settings.deliveryFee),
        partnerIncentive: String(settings.partnerIncentive),
        supportPhone: settings.supportPhone,
        supportWhatsApp: settings.supportWhatsApp,
        platformUpiId: settings.platformUpiId,
        platformUpiName: settings.platformUpiName,
      });
      setPlaces(settings.servicePlaces.map((p) => ({ ...p })));
    }
  }, [status, settings, values]);

  const shopsByPlace = useMemo(() => {
    const map = {};
    for (const x of shops.data || []) map[x.placeId] = (map[x.placeId] || 0) + 1;
    return map;
  }, [shops.data]);

  const set = (field) => (e) => {
    const isPhone = field === 'supportPhone' || field === 'supportWhatsApp';
    const v = isPhone ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setValues((x) => ({ ...x, [field]: v }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const addPlace = () => {
    const name = newPlace.trim();
    if (!name) return;
    const id = slug(name);
    if (!id || places.some((p) => p.id === id || p.name.toLowerCase() === name.toLowerCase())) {
      setPlaceError(t('admin.settings.placeExists'));
      return;
    }
    setPlaces((list) => [...list, { id, name }]);
    setNewPlace('');
    setPlaceError('');
    showToast(t('admin.settings.placeAdded', { name }), { type: 'success' });
  };

  const removePlace = (place) => {
    const count = shopsByPlace[place.id] || 0;
    if (count) {
      showToast(t('admin.settings.placeInUse', { name: place.name, count }), { type: 'error', duration: 5000 });
      return;
    }
    setPlaces((list) => list.filter((p) => p.id !== place.id));
    showToast(t('admin.settings.placeRemoved', { name: place.name }), { type: 'info' });
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    const fee = Number(values.deliveryFee);
    const incentive = Number(values.partnerIncentive);
    if (values.deliveryFee === '' || !(fee >= 0)) er.deliveryFee = t('admin.settings.amountError');
    if (values.partnerIncentive === '' || !(incentive >= 0)) er.partnerIncentive = t('admin.settings.amountError');
    if (!isValidPhone(values.supportPhone)) er.supportPhone = t('admin.common.phoneError');
    if (!isValidPhone(values.supportWhatsApp)) er.supportWhatsApp = t('admin.common.phoneError');
    if (!UPI_PATTERN.test(values.platformUpiId.trim())) er.platformUpiId = t('admin.common.upiError');
    if (!values.platformUpiName.trim()) er.platformUpiName = t('admin.common.required');
    places.forEach((p, i) => {
      if (!p.name.trim()) er[`place-${i}`] = t('admin.common.required');
    });
    setErrors(er);
    if (Object.keys(er).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        deliveryFee: fee,
        partnerIncentive: incentive,
        supportPhone: cleanPhone(values.supportPhone),
        supportWhatsApp: cleanPhone(values.supportWhatsApp),
        platformUpiId: values.platformUpiId.trim(),
        platformUpiName: values.platformUpiName.trim(),
        servicePlaces: places.map((p) => ({ id: p.id, name: p.name.trim() })),
      });
      showToast(t('admin.settings.saved'), { type: 'success' });
    } catch (err) {
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'error') return <ErrorState onRetry={reload} />;
  if (!values) return <SkeletonList count={3} />;

  return (
    <>
      <div className={a.head}>
        <h1 className={a.title}>{t('admin.settings.title')}</h1>
      </div>

      <form ref={formRef} onSubmit={submit} noValidate className={s.layout}>
        <Card>
          <h2 className={a.blockTitle}>{t('admin.settings.fees')}</h2>
          <div className={a.form}>
            <Input
              label={t('admin.settings.deliveryFee')}
              hint={t('admin.settings.deliveryFeeHint')}
              type="number"
              inputMode="decimal"
              min="0"
              value={values.deliveryFee}
              onChange={set('deliveryFee')}
              error={errors.deliveryFee}
            />
            <Input
              label={t('admin.settings.incentive')}
              hint={t('admin.settings.incentiveHint')}
              type="number"
              inputMode="decimal"
              min="0"
              value={values.partnerIncentive}
              onChange={set('partnerIncentive')}
              error={errors.partnerIncentive}
            />
          </div>
        </Card>

        <Card>
          <h2 className={a.blockTitle}>{t('admin.settings.support')}</h2>
          <div className={a.form}>
            <Input label={t('admin.settings.supportPhone')} prefix="+91" type="tel" inputMode="numeric" value={values.supportPhone} onChange={set('supportPhone')} error={errors.supportPhone} />
            <Input label={t('admin.settings.supportWhatsApp')} prefix="+91" type="tel" inputMode="numeric" value={values.supportWhatsApp} onChange={set('supportWhatsApp')} error={errors.supportWhatsApp} />
            <Input
              label={t('admin.settings.upiId')}
              hint={t('admin.settings.upiHint')}
              autoCapitalize="none"
              spellCheck={false}
              value={values.platformUpiId}
              onChange={set('platformUpiId')}
              error={errors.platformUpiId}
            />
            <Input label={t('admin.settings.upiName')} value={values.platformUpiName} onChange={set('platformUpiName')} error={errors.platformUpiName} />
          </div>
        </Card>

        <Card className={s.areaCard}>
          <h2 className={a.blockTitle} style={{ marginBottom: 'var(--space-1)' }}>{t('admin.settings.area')}</h2>
          <p className={a.muted}>{t('admin.settings.areaHint')}</p>
          <ul className={s.places}>
            {places.map((p, i) => (
              <li key={p.id} className={s.place}>
                <Input
                  label={t('admin.settings.renamePlace', { index: i + 1 })}
                  className={s.placeInput}
                  value={p.name}
                  error={errors[`place-${i}`]}
                  onChange={(e) => setPlaces((list) => list.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                />
                <span className={s.count}>{t('admin.settings.shopsInPlace', { count: shopsByPlace[p.id] || 0 })}</span>
                <Button variant="ghost" aria-label={t('admin.settings.removePlace', { name: p.name })} iconLeft={<TrashIcon size={18} />} onClick={() => removePlace(p)} className={s.remove} />
              </li>
            ))}
          </ul>
          <div className={s.addRow}>
            <Input
              label={t('admin.settings.placeName')}
              value={newPlace}
              error={placeError}
              onChange={(e) => {
                setNewPlace(e.target.value);
                setPlaceError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPlace();
                }
              }}
            />
            <Button variant="secondary" iconLeft={<PlusIcon size={18} />} onClick={addPlace} disabled={!newPlace.trim()}>
              {t('admin.settings.addPlace')}
            </Button>
          </div>
        </Card>

        <div className={s.saveRow}>
          <Button type="submit" size="lg" loading={saving}>
            {t('admin.settings.save')}
          </Button>
        </div>
      </form>
    </>
  );
}
