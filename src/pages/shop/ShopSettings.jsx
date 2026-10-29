import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useShopPanel } from '../../context/ShopPanelContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Input, SkeletonList, SmartImage } from '../../components/ui/index.js';
import SubscriptionBanner from '../../components/shop/SubscriptionBanner.jsx';
import { CategoryIcon, ChatIcon, ImageIcon, LogoutIcon } from '../../components/icons/Icons.jsx';
import { SUBSCRIPTION_STATUS } from '../../utils/constants.js';
import { cleanPhone, formatDate, isValidPhone } from '../../utils/format.js';
import { whatsappLink } from '../../utils/links.js';
import p from '../../styles/page.module.css';
import DeleteAccount from '../../components/account/DeleteAccount.jsx';
import s from './ShopSettings.module.css';

const UPI_PATTERN = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;
const SUB_TONE = { [SUBSCRIPTION_STATUS.ACTIVE]: 'success', [SUBSCRIPTION_STATUS.TRIAL]: 'info', [SUBSCRIPTION_STATUS.EXPIRED]: 'danger' };

/** Shop settings: timings, phone, UPI ID, photo (preview only), subscription, logout. */
export default function ShopSettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { shop, shopLoading, shopError, reloadShop, updateShop } = useShopPanel();
  const { getPlace, settings } = useSettings();
  const { showToast } = useToast();

  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (shop && !values) {
      setValues({ open: shop.timings.open, close: shop.timings.close, phone: shop.phone, upiId: shop.upiId });
    }
  }, [shop, values]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const set = (field) => (e) => {
    const v = field === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setValues((x) => ({ ...x, [field]: v }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!values.open || !values.close || values.close <= values.open) er.close = t('shopPanel.settings.timeError');
    if (!isValidPhone(values.phone)) er.phone = t('shopPanel.settings.phoneError');
    if (!UPI_PATTERN.test(values.upiId.trim())) er.upiId = t('shopPanel.settings.upiError');
    setErrors(er);
    if (Object.keys(er).length) {
      e.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    try {
      await updateShop({
        timings: { open: values.open, close: values.close },
        phone: cleanPhone(values.phone),
        upiId: values.upiId.trim(),
      });
      showToast(t('shopPanel.settings.saved'), { type: 'success' });
    } catch (err) {
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (shopLoading && !shop) {
    return (
      <main className={p.page}>
        <SkeletonList count={3} />
      </main>
    );
  }
  if (shopError && !shop) {
    return (
      <main className={p.page}>
        <ErrorState error={shopError} onRetry={reloadShop} />
      </main>
    );
  }
  if (!values) return null;

  const sub = shop.subscription;

  return (
    <main className={p.page}>
      <h1 className={s.title}>{t('shopPanel.settings.title')}</h1>

      <Card className={s.block}>
        <div className={s.photoRow}>
          <div className={s.photo}>
            <SmartImage src={preview || shop.image} alt="" ratio="1 / 1" fallback={<CategoryIcon category={shop.category} size={36} />} />
          </div>
          <div className={s.details}>
            <h2 className={s.shopName}>{shop.name}</h2>
            <p className={p.muted}>
              {t(`categories.${shop.category}`)} · {getPlace(shop.placeId)?.name}
            </p>
            <Button variant="outline" size="sm" iconLeft={<ImageIcon size={18} />} onClick={() => fileRef.current?.click()}>
              {t('shopPanel.productForm.chooseImage')}
            </Button>
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
        <p className={`${p.muted} ${s.photoHint}`}>{t('shopPanel.productForm.imageHint')}</p>
      </Card>

      <form className={s.form} onSubmit={submit} noValidate>
        <Card className={s.block}>
          <h2 className={s.blockTitle}>{t('shopPanel.settings.timings')}</h2>
          <div className={s.times}>
            <Input label={t('shopPanel.settings.openTime')} type="time" required value={values.open} onChange={set('open')} />
            <Input label={t('shopPanel.settings.closeTime')} type="time" required value={values.close} onChange={set('close')} error={errors.close} />
          </div>
        </Card>
        <Card className={s.block}>
          <div className={s.fields}>
            <Input
              label={t('shopPanel.settings.phoneLabel')}
              prefix="+91"
              type="tel"
              inputMode="numeric"
              required
              value={values.phone}
              onChange={set('phone')}
              error={errors.phone}
            />
            <Input
              label={t('shopPanel.settings.upiLabel')}
              hint={t('shopPanel.settings.upiHint')}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={values.upiId}
              onChange={set('upiId')}
              error={errors.upiId}
            />
          </div>
        </Card>
        <Button type="submit" size="lg" block loading={saving} className={s.block}>
          {t('shopPanel.settings.save')}
        </Button>
      </form>

      <section className={p.section} aria-labelledby="sub-title">
        <h2 id="sub-title" className={p.sectionTitle}>{t('shopPanel.subscription.title')}</h2>
        <Card className={s.sub}>
          <SubscriptionBanner subscription={sub} />
          <dl className={s.subGrid}>
            <div>
              <dt>{t('shopPanel.subscription.plan')}</dt>
              <dd>{sub.plan || '—'}</dd>
            </div>
            <div>
              <dt>{t('shopPanel.subscription.status')}</dt>
              <dd>
                <Badge tone={SUB_TONE[sub.status]}>{t(`subscription.${sub.status}`)}</Badge>
              </dd>
            </div>
            <div>
              <dt>{t('shopPanel.subscription.startedOn')}</dt>
              <dd>{formatDate(sub.startDate) || '—'}</dd>
            </div>
            <div>
              <dt>{t('shopPanel.subscription.validTill')}</dt>
              <dd>{formatDate(sub.endDate) || '—'}</dd>
            </div>
          </dl>
          <Button as="a" href={whatsappLink(settings.supportWhatsApp)} target="_blank" rel="noopener noreferrer" variant="outline" iconLeft={<ChatIcon size={18} />}>
            {t('shopPanel.subscription.contact')}
          </Button>
        </Card>
      </section>

      <Button variant="outline" size="lg" block iconLeft={<LogoutIcon size={20} />} className={s.logout} onClick={() => setConfirmLogout(true)}>
        {t('shopPanel.settings.logout')}
      </Button>

      <DeleteAccount />

      <ConfirmDialog
        open={confirmLogout}
        title={t('shopPanel.settings.logoutTitle')}
        confirmLabel={t('shopPanel.settings.logout')}
        tone="danger"
        onClose={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await logout();
          navigate('/shop-panel', { replace: true });
        }}
      />
    </main>
  );
}
