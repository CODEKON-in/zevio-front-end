import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { saveShop } from '../../services/shopService.js';
import Drawer from '../ui/Drawer.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import SmartImage from '../ui/SmartImage.jsx';
import Toggle from '../ui/Toggle.jsx';
import { CategoryIcon, ImageIcon } from '../icons/Icons.jsx';
import { SHOP_CATEGORIES, SUBSCRIPTION_STATUS } from '../../utils/constants.js';
import { cleanPhone, isValidPhone } from '../../utils/format.js';
import a from '../../pages/admin/admin.module.css';

const EMAIL_PATTERN = /^[\w.-]+@[\w.-]+\.\w{2,}$/;
const UPI_PATTERN = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function toValues(shop) {
  return {
    name: shop?.name ?? '',
    category: shop?.category ?? 'hotels',
    ownerName: shop?.ownerName ?? '',
    phone: shop?.phone ?? '',
    email: shop?.email ?? '',
    placeId: shop?.placeId ?? '',
    address: shop?.address ?? '',
    upiId: shop?.upiId ?? '',
    open: shop?.timings?.open ?? '08:00',
    close: shop?.timings?.close ?? '21:00',
    deliveryTime: shop?.deliveryTime ?? '30-40',
    isActive: shop?.isActive ?? true,
    plan: shop?.subscription?.plan ?? 'Free trial',
    subStatus: shop?.subscription?.status ?? SUBSCRIPTION_STATUS.TRIAL,
    startDate: shop?.subscription?.startDate ?? today(),
    endDate: shop?.subscription?.endDate ?? plusDays(30),
  };
}

/**
 * ShopFormDrawer — add / edit a shop including its subscription.
 * Props: open, shop (null = new), onClose, onSaved(savedShop)
 */
export default function ShopFormDrawer({ open, shop, onClose, onSaved }) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [values, setValues] = useState(() => toValues(shop));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValues(toValues(shop));
      setErrors({});
      setPreview(null);
    }
  }, [open, shop]);

  const set = (field) => (e) => {
    const v = field === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setValues((x) => ({ ...x, [field]: v }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = async (e) => {
    e?.preventDefault();
    const req = t('admin.common.required');
    const er = {};
    if (!values.name.trim()) er.name = req;
    if (!values.ownerName.trim()) er.ownerName = req;
    if (!isValidPhone(values.phone)) er.phone = t('admin.common.phoneError');
    // Every shop needs an email: it is how its owner claims the account with Google.
    if (!EMAIL_PATTERN.test(values.email.trim())) er.email = t('admin.shopForm.emailError');
    if (!values.placeId) er.placeId = req;
    if (!values.address.trim()) er.address = req;
    if (!UPI_PATTERN.test(values.upiId.trim())) er.upiId = t('admin.common.upiError');
    if (!values.open || !values.close || values.close <= values.open) er.close = t('admin.shopForm.timeError');
    if (!values.plan.trim()) er.plan = req;
    if (!values.startDate || !values.endDate || values.endDate < values.startDate) er.endDate = t('admin.shopForm.dateError');
    setErrors(er);
    if (Object.keys(er).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    try {
      const saved = await saveShop({
        ...(shop?.id ? { id: shop.id } : {}),
        name: values.name.trim(),
        category: values.category,
        ownerName: values.ownerName.trim(),
        phone: cleanPhone(values.phone),
        email: values.email.trim().toLowerCase(),
        placeId: values.placeId,
        address: values.address.trim(),
        upiId: values.upiId.trim(),
        timings: { open: values.open, close: values.close },
        deliveryTime: values.deliveryTime.trim() || '30-40',
        isActive: values.isActive,
        subscription: { plan: values.plan.trim(), status: values.subStatus, startDate: values.startDate, endDate: values.endDate },
      });
      showToast(shop ? t('admin.shopForm.updated') : t('admin.shopForm.created'), { type: 'success' });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={shop ? t('admin.shopForm.editTitle') : t('admin.shopForm.newTitle')}
      width="560px"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={saving} onClick={submit}>{t('admin.shopForm.save')}</Button>
        </>
      }
    >
      <form ref={formRef} className={a.form} onSubmit={submit} noValidate>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div style={{ width: 80, flexShrink: 0 }}>
            <SmartImage src={preview || shop?.image} alt="" ratio="1 / 1" fallback={<CategoryIcon category={values.category} size={30} />} />
          </div>
          <div>
            <Button variant="outline" size="sm" iconLeft={<ImageIcon size={18} />} onClick={() => fileRef.current?.click()}>
              {t('admin.shopForm.choosePhoto')}
            </Button>
            <p className={a.muted}>{t('admin.shopForm.photoHint')}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
          </div>
        </div>

        <Input label={t('admin.shopForm.name')} required value={values.name} onChange={set('name')} error={errors.name} />
        <div className={a.twoCols}>
          <Select
            label={t('admin.shopForm.category')}
            value={values.category}
            onChange={set('category')}
            options={SHOP_CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))}
          />
          <Select
            label={t('admin.shopForm.place')}
            required
            placeholder={t('address.placePlaceholder')}
            value={values.placeId}
            onChange={set('placeId')}
            error={errors.placeId}
            options={settings.servicePlaces.map((pl) => ({ value: pl.id, label: pl.name }))}
          />
        </div>
        <Input label={t('admin.shopForm.address')} required value={values.address} onChange={set('address')} error={errors.address} />
        <div className={a.twoCols}>
          <Input label={t('admin.shopForm.owner')} required value={values.ownerName} onChange={set('ownerName')} error={errors.ownerName} />
          <Input label={t('admin.shopForm.phone')} required prefix="+91" type="tel" inputMode="numeric" value={values.phone} onChange={set('phone')} error={errors.phone} />
        </div>
        <Input label={t('admin.shopForm.email')} required type="email" autoCapitalize="none" spellCheck={false} value={values.email} onChange={set('email')} error={errors.email} />
        <Input label={t('admin.shopForm.upi')} required autoCapitalize="none" spellCheck={false} value={values.upiId} onChange={set('upiId')} error={errors.upiId} />
        <div className={a.twoCols}>
          <Input label={t('admin.shopForm.openTime')} type="time" value={values.open} onChange={set('open')} />
          <Input label={t('admin.shopForm.closeTime')} type="time" value={values.close} onChange={set('close')} error={errors.close} />
        </div>
        <Input label={t('admin.shopForm.deliveryTime')} hint={t('admin.shopForm.deliveryTimeHint')} value={values.deliveryTime} onChange={set('deliveryTime')} />
        <Toggle label={t('admin.shopForm.activeLabel')} checked={values.isActive} onChange={(v) => setValues((x) => ({ ...x, isActive: v }))} />

        <section className={a.formSection} aria-labelledby="sub-head">
          <h3 id="sub-head">{t('admin.shopForm.subscription')}</h3>
          <div className={a.twoCols}>
            <Input label={t('admin.shopForm.plan')} required value={values.plan} onChange={set('plan')} error={errors.plan} />
            <Select
              label={t('admin.shopForm.subStatus')}
              value={values.subStatus}
              onChange={set('subStatus')}
              options={Object.values(SUBSCRIPTION_STATUS).map((st) => ({ value: st, label: t(`subscription.${st}`) }))}
            />
          </div>
          <div className={a.twoCols}>
            <Input label={t('admin.shopForm.startDate')} type="date" value={values.startDate} onChange={set('startDate')} />
            <Input label={t('admin.shopForm.endDate')} type="date" value={values.endDate} onChange={set('endDate')} error={errors.endDate} />
          </div>
        </section>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Drawer>
  );
}
