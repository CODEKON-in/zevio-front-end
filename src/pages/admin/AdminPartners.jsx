import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getPartners, savePartner } from '../../services/userService.js';
import { Badge, Button, Drawer, EmptyState, ErrorState, Input, Select, SkeletonList, Toggle } from '../../components/ui/index.js';
import DataTable from '../../components/admin/DataTable.jsx';
import { BikeIcon, EditIcon, PlusIcon } from '../../components/icons/Icons.jsx';
import { cleanPhone, isValidPhone } from '../../utils/format.js';
import a from './admin.module.css';

const REFRESH_MS = 20000;
const EMPTY = { name: '', phone: '', vehicle: '', placeId: '', isActive: true };

/** Admin delivery partners: list with online status and today's deliveries, add / edit, activate. */
export default function AdminPartners() {
  const { settings, getPlace } = useSettings();
  const { showToast } = useToast();
  const partners = useAsync(() => getPartners(), []);
  const [editing, setEditing] = useState(null); // null | 'new' | partner
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const formRef = useRef(null);

  // Online status changes from the partners' phones — refresh now and then.
  useEffect(() => {
    const timer = setInterval(partners.reload, REFRESH_MS);
    return () => clearInterval(timer);
  }, [partners.reload]);

  useEffect(() => {
    if (!editing) return;
    setErrors({});
    setValues(editing === 'new' ? EMPTY : { name: editing.name, phone: editing.phone, vehicle: editing.vehicle || '', placeId: editing.placeId || '', isActive: editing.isActive });
  }, [editing]);

  const set = (field) => (e) => {
    const v = field === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setValues((x) => ({ ...x, [field]: v }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = async (e) => {
    e?.preventDefault();
    const er = {};
    if (!values.name.trim()) er.name = t('admin.common.required');
    if (!isValidPhone(values.phone)) er.phone = t('admin.common.phoneError');
    if (!values.placeId) er.placeId = t('admin.common.required');
    setErrors(er);
    if (Object.keys(er).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    try {
      await savePartner({
        ...(editing !== 'new' ? { id: editing.id } : {}),
        name: values.name.trim(),
        phone: cleanPhone(values.phone),
        vehicle: values.vehicle.trim().toUpperCase(),
        placeId: values.placeId,
        isActive: values.isActive,
        // A deactivated partner cannot stay online.
        ...(values.isActive ? {} : { isOnline: false }),
      });
      showToast(editing === 'new' ? t('admin.partners.created') : t('admin.partners.updated'), { type: 'success' });
      setEditing(null);
      partners.reload();
    } catch (err) {
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p, isActive) => {
    setBusyId(p.id);
    try {
      await savePartner({ id: p.id, isActive, ...(isActive ? {} : { isOnline: false }) });
      partners.setData((list) => list.map((x) => (x.id === p.id ? { ...x, isActive, isOnline: isActive ? x.isOnline : false } : x)));
      showToast(t('admin.partners.updated'), { type: 'success' });
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    { key: 'name', header: t('admin.partners.col.name'), render: (p) => <span className={a.cellMain}>{p.name}</span> },
    { key: 'phone', header: t('admin.partners.col.phone'), render: (p) => `+91 ${p.phone}` },
    { key: 'place', header: t('admin.partners.col.place'), render: (p) => getPlace(p.placeId)?.name || t('admin.common.none') },
    { key: 'vehicle', header: t('admin.partners.col.vehicle'), render: (p) => p.vehicle || t('admin.common.none') },
    {
      key: 'status',
      header: t('admin.partners.col.status'),
      render: (p) => <Badge tone={p.isOnline ? 'success' : 'neutral'} size="sm">{p.isOnline ? t('admin.common.online') : t('admin.common.offline')}</Badge>,
    },
    { key: 'today', header: t('admin.partners.col.today'), align: 'center', render: (p) => <strong>{p.todayDeliveries}</strong> },
    {
      key: 'active',
      header: t('admin.partners.col.active'),
      render: (p) => (
        <Toggle label="" ariaLabel={t('admin.partners.activeAria', { name: p.name })} checked={p.isActive} loading={busyId === p.id} onChange={(v) => toggleActive(p, v)} />
      ),
    },
    {
      key: 'actions',
      header: t('admin.common.actions'),
      align: 'right',
      render: (p) => (
        <Button variant="ghost" size="sm" iconLeft={<EditIcon size={16} />} aria-label={t('admin.partners.editAria', { name: p.name })} onClick={() => setEditing(p)}>
          {t('admin.common.edit')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className={a.head}>
        <h1 className={a.title}>{t('admin.partners.title')}</h1>
        <Button iconLeft={<PlusIcon size={20} />} onClick={() => setEditing('new')}>
          {t('admin.partners.add')}
        </Button>
      </div>

      {partners.loading && !partners.data ? (
        <SkeletonList count={3} />
      ) : partners.error && !partners.data ? (
        <ErrorState error={partners.error} onRetry={partners.reload} />
      ) : !partners.data.length ? (
        <EmptyState icon={<BikeIcon size={36} />} message={t('admin.common.noResults')} />
      ) : (
        <DataTable caption={t('admin.partners.title')} columns={columns} rows={partners.data} rowClassName={(p) => (p.isActive ? '' : a.dim)} />
      )}

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('admin.partnerForm.newTitle') : t('admin.partnerForm.editTitle')}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={submit}>{t('admin.partnerForm.save')}</Button>
          </>
        }
      >
        <form ref={formRef} className={a.form} onSubmit={submit} noValidate>
          <Input label={t('admin.partnerForm.name')} required value={values.name} onChange={set('name')} error={errors.name} />
          <Input label={t('admin.partnerForm.phone')} required prefix="+91" type="tel" inputMode="numeric" value={values.phone} onChange={set('phone')} error={errors.phone} />
          <Input label={t('admin.partnerForm.vehicle')} value={values.vehicle} onChange={set('vehicle')} placeholder="TN 49 AB 1234" />
          <Select
            label={t('admin.partnerForm.place')}
            required
            placeholder={t('address.placePlaceholder')}
            value={values.placeId}
            onChange={set('placeId')}
            error={errors.placeId}
            options={settings.servicePlaces.map((pl) => ({ value: pl.id, label: pl.name }))}
          />
          <Toggle label={t('admin.partnerForm.activeLabel')} checked={values.isActive} onChange={(v) => setValues((x) => ({ ...x, isActive: v }))} />
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      </Drawer>
    </>
  );
}
