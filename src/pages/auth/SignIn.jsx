import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input } from '../../components/ui/index.js';
import { ChevronLeftIcon } from '../../components/icons/Icons.jsx';
import { ROLES } from '../../utils/constants.js';
import { cleanPhone, isValidPhone } from '../../utils/format.js';
import GoogleButton from './GoogleButton.jsx';
import l from '../../styles/login.module.css';
import s from './SignIn.module.css';
import MangoMark from '../../components/brand/MangoMark.jsx';

/**
 * SignIn — the customer sign-in screen.
 *
 * Step 1: Continue with Google (Google only, no passwords).
 * Step 2 (first time only): name and phone.
 *
 * There used to be a "Who are you?" chooser here, because shop owners and
 * delivery partners signed in through the same screen. They have no app of
 * their own any more — the admin manages shops and partners — so anyone
 * arriving here is a customer and there is nothing to choose.
 */
export default function SignIn() {
  const { signInWithGoogle, completeSignUp } = useAuth();
  const { showToast } = useToast();
  const [google, setGoogle] = useState(null); // set when this Google account needs to sign up
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `${t('auth.title')}`;
    return () => {
      document.title = t('app.name');
    };
  }, []);

  const handleGoogle = async (account) => {
    setBusy(true);
    try {
      const result = await signInWithGoogle(ROLES.CUSTOMER, account);
      if (result.user) showToast(t('login.welcome', { name: result.user.name }), { type: 'success' });
      else setGoogle(account);
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (details) => {
    const u = await completeSignUp(ROLES.CUSTOMER, google, details);
    showToast(t('auth.created', { name: u.name }), { type: 'success' });
  };

  return (
    <main className={l.page}>
      <div className={l.hero}>
        <span className={l.logo} aria-hidden="true">
          <MangoMark size={60} />
        </span>
        <p className={l.appName}>{t('app.name')}</p>
      </div>

      <section className={l.card} aria-labelledby="signin-title">
        {google ? (
          <SignUpForm google={google} onBack={() => setGoogle(null)} onSubmit={handleSignUp} />
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

            <GoogleButton onSuccess={handleGoogle} busy={busy} />
            <p className={l.note}>{t('auth.googleNote')}</p>
          </>
        )}
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function SignUpForm({ google, onBack, onSubmit }) {
  const { showToast } = useToast();
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [v, setV] = useState({ name: google.name || '', phone: '' });

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const set = (field) => (e) => {
    const value = field === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setV((x) => ({ ...x, [field]: value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!v.name.trim()) er.name = t('auth.nameError');
    if (!isValidPhone(v.phone)) er.phone = t('auth.phoneError');
    setErrors(er);
    if (Object.keys(er).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: v.name, phone: cleanPhone(v.phone) });
    } catch (err) {
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" className={s.back} onClick={onBack}>
        <ChevronLeftIcon size={20} /> {t('auth.backToSignIn')}
      </button>
      <div>
        <h1 id="signin-title" className={s.title} tabIndex={-1} ref={headingRef}>
          {t('auth.signUpTitle')}
        </h1>
        <p className={l.subtitle} style={{ marginTop: 'var(--space-2)' }}>
          {t('auth.signUpSubtitle.customer')}
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
        <Input label={t('auth.yourName')} autoComplete="name" required value={v.name} onChange={set('name')} error={errors.name} />
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
        <Button type="submit" size="lg" block loading={saving}>
          {t('auth.create')}
        </Button>
      </form>
    </>
  );
}
