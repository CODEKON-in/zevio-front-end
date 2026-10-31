import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input, Select } from '../../components/ui/index.js';
import { BikeIcon, ChevronLeftIcon, StoreIcon, UserIcon } from '../../components/icons/Icons.jsx';
import { ROLES, ROLE_HOME, SHOP_CATEGORIES } from '../../utils/constants.js';
import { cleanPhone, cx, isValidPhone } from '../../utils/format.js';
import GoogleButton from './GoogleButton.jsx';
import l from '../../styles/login.module.css';
import s from './SignIn.module.css';

const ROLE_CHOICES = [
  { role: ROLES.CUSTOMER, Icon: UserIcon },
  { role: ROLES.SHOP, Icon: StoreIcon },
  { role: ROLES.DELIVERY, Icon: BikeIcon },
];
const UPI_PATTERN = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;
const roleLabel = (role) => (role === ROLES.ADMIN ? t('roles.admin') : t(`auth.roles.${role}`));

/**
 * SignIn — the one sign-in screen for customers, shop owners and delivery partners.
 * Step 1: "Who are you?" + Continue with Google (Google only, no passwords).
 * Step 2 (first time only): a short sign-up form for the chosen role.
 *
 * Props: role — the option chosen at first (the section the visitor opened).
 */
export default function SignIn({ role: initialRole = ROLES.CUSTOMER }) {
  const navigate = useNavigate();
  const { user, signInWithGoogle, completeSignUp } = useAuth();
  const { showToast } = useToast();
  const [role, setRole] = useState(initialRole);
  const [google, setGoogle] = useState(null); // set when this Google account needs to sign up
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `${t('auth.title')}`;
    return () => {
      document.title = t('app.name');
    };
  }, []);

  const enter = (u) => {
    showToast(t('login.welcome', { name: u.name }), { type: 'success' });
    // Opened this section? Stay on the same page. Otherwise go to the chosen section.
    if (u.role !== initialRole) navigate(ROLE_HOME[u.role]);
  };

  const handleGoogle = async (account) => {
    setBusy(true);
    try {
      const result = await signInWithGoogle(role, account);
      if (result.user) enter(result.user);
      else setGoogle(account);
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (details) => {
    const u = await completeSignUp(role, google, details);
    showToast(t('auth.created', { name: u.name }), { type: 'success' });
    if (u.role !== initialRole) navigate(ROLE_HOME[u.role]);
  };

  return (
    <main className={l.page}>
      <div className={l.hero}>
        <span className={l.logo} aria-hidden="true">
          <StoreIcon size={40} />
        </span>
        <p className={l.appName}>{t('app.name')}</p>
      </div>

      <section className={l.card} aria-labelledby="signin-title">
        {google ? (
          <SignUpForm role={role} google={google} onBack={() => setGoogle(null)} onSubmit={handleSignUp} />
        ) : (
          <>
            <div>
              <h1 id="signin-title" className={s.title}>
                {t('auth.title')}
              </h1>
              <p className={l.subtitle} style={{ marginTop: 'var(--space-1)' }}>
                {t('auth.subtitle')}
              </p>
            </div>

            {user && user.role !== initialRole && (
              <div className={s.already} role="note">
                <p>{t('auth.signedInAs', { role: roleLabel(user.role).toLowerCase(), name: user.name })}</p>
                <Button variant="outline" size="sm" onClick={() => navigate(ROLE_HOME[user.role])}>
                  {t('auth.goBack', { role: roleLabel(user.role).toLowerCase() })}
                </Button>
                <p className={s.alreadyNote}>{t('auth.switchNote')}</p>
              </div>
            )}

            <fieldset className={s.roles}>
              <legend className={s.legend}>{t('auth.whoAreYou')}</legend>
              {ROLE_CHOICES.map(({ role: r, Icon }) => (
                <label key={r} className={cx(s.roleCard, role === r && s.roleOn)}>
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className={s.radio} />
                  <span className={s.roleIcon} aria-hidden="true">
                    <Icon size={26} />
                  </span>
                  <span className={s.roleText}>
                    <span className={s.roleName}>{t(`auth.roles.${r}`)}</span>
                    <span className={s.roleDesc}>{t(`auth.roles.${r}Desc`)}</span>
                  </span>
                  <span className={s.check} aria-hidden="true" />
                </label>
              ))}
            </fieldset>

            <GoogleButton onSuccess={handleGoogle} busy={busy} />
            <p className={l.note}>{t('auth.googleNote')}</p>
          </>
        )}
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function SignUpForm({ role, google, onBack, onSubmit }) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [v, setV] = useState({
    name: google.name || '',
    phone: '',
    shopName: '',
    category: SHOP_CATEGORIES[0],
    placeId: '',
    address: '',
    upiId: '',
    vehicle: '',
  });

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const set = (field) => (e) => {
    const value = field === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setV((x) => ({ ...x, [field]: value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const places = (settings?.servicePlaces || []).map((p) => ({ value: p.id, label: p.name }));

  const submit = async (e) => {
    e.preventDefault();
    const req = t('auth.required');
    const er = {};
    if (!v.name.trim()) er.name = t('auth.nameError');
    if (!isValidPhone(v.phone)) er.phone = t('auth.phoneError');
    if (role === ROLES.SHOP) {
      if (!v.shopName.trim()) er.shopName = req;
      if (!v.placeId) er.placeId = req;
      if (!v.address.trim()) er.address = req;
      if (!UPI_PATTERN.test(v.upiId.trim())) er.upiId = t('auth.upiError');
    }
    if (role === ROLES.DELIVERY) {
      if (v.vehicle.trim().length < 4) er.vehicle = t('auth.vehicleError');
      if (!v.placeId) er.placeId = req;
    }
    setErrors(er);
    if (Object.keys(er).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    try {
      const phone = cleanPhone(v.phone);
      if (role === ROLES.CUSTOMER) await onSubmit({ name: v.name, phone });
      if (role === ROLES.SHOP) await onSubmit({ ownerName: v.name, phone, shopName: v.shopName, category: v.category, placeId: v.placeId, address: v.address, upiId: v.upiId });
      if (role === ROLES.DELIVERY) await onSubmit({ name: v.name, phone, vehicle: v.vehicle, placeId: v.placeId });
    } catch (err) {
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" className={s.back} onClick={onBack}>
        <ChevronLeftIcon size={20} /> {t('auth.backToRoles')}
      </button>
      <div>
        <h1 id="signin-title" className={s.title} tabIndex={-1} ref={headingRef}>
          {t('auth.signUpTitle')}
        </h1>
        <p className={s.roleTag}>{t(`auth.roles.${role}`)}</p>
        <p className={l.subtitle} style={{ marginTop: 'var(--space-2)' }}>
          {t(`auth.signUpSubtitle.${role}`)}
        </p>
      </div>

      <div className={s.identity}>
        <span className={s.avatar} aria-hidden="true">
          {google.picture ? <img src={google.picture} alt="" referrerPolicy="no-referrer" /> : (google.name || google.email).charAt(0).toUpperCase()}
        </span>
        <span className={s.accountText}>
          <span className={s.accountName}>{google.name || google.email}</span>
          <span className={s.accountEmail}>{google.email}</span>
        </span>
      </div>
      <button type="button" className={s.linkBtn} onClick={onBack}>
        {t('auth.notYou')}
      </button>

      <form ref={formRef} className={l.form} onSubmit={submit} noValidate>
        <Input label={role === ROLES.SHOP ? t('auth.ownerName') : t('auth.yourName')} autoComplete="name" required value={v.name} onChange={set('name')} error={errors.name} />
        <Input
          label={t('auth.phone')}
          hint={t('auth.phoneHint')}
          prefix="+91"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required
          value={v.phone}
          onChange={set('phone')}
          error={errors.phone}
        />
        {role === ROLES.SHOP && (
          <>
            <Input label={t('auth.shopName')} required value={v.shopName} onChange={set('shopName')} error={errors.shopName} />
            <Select label={t('auth.category')} value={v.category} onChange={set('category')} options={SHOP_CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))} />
            <Select label={t('auth.place')} placeholder={t('auth.placePlaceholder')} required value={v.placeId} onChange={set('placeId')} options={places} error={errors.placeId} />
            <Input label={t('auth.address')} placeholder={t('auth.addressPlaceholder')} required value={v.address} onChange={set('address')} error={errors.address} />
            <Input
              label={t('auth.upi')}
              placeholder={t('auth.upiPlaceholder')}
              autoCapitalize="none"
              spellCheck={false}
              required
              value={v.upiId}
              onChange={set('upiId')}
              error={errors.upiId}
            />
          </>
        )}
        {role === ROLES.DELIVERY && (
          <>
            <Input label={t('auth.vehicle')} placeholder={t('auth.vehiclePlaceholder')} autoCapitalize="characters" required value={v.vehicle} onChange={set('vehicle')} error={errors.vehicle} />
            <Select label={t('auth.basePlace')} placeholder={t('auth.placePlaceholder')} required value={v.placeId} onChange={set('placeId')} options={places} error={errors.placeId} />
          </>
        )}
        <Button type="submit" size="lg" block loading={saving}>
          {t('auth.create')}
        </Button>
      </form>
    </>
  );
}
