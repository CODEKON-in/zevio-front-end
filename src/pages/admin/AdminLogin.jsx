import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input } from '../../components/ui/index.js';
import { SlidersIcon } from '../../components/icons/Icons.jsx';
import { ROLES } from '../../utils/constants.js';
import { USE_API } from '../../services/api/config.js';
import s from '../../styles/login.module.css';

/**
 * Admin login. In API mode the email and password are checked against the
 * admin's row in the database (POST /api/auth/admin); the demo build keeps the
 * old password-less login.
 */
export default function AdminLogin() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState(USE_API ? '' : 'admin@zevio.in');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (USE_API) {
      const er = {};
      if (!email.trim()) er.email = t('admin.common.required');
      if (!password) er.password = t('admin.common.required');
      setErrors(er);
      if (Object.keys(er).length) return;
    }
    setBusy(true);
    try {
      await login(ROLES.ADMIN, { email: email.trim(), password });
    } catch (err) {
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <main className={s.page}>
      <div className={s.hero}>
        <span className={s.logo} aria-hidden="true">
          <SlidersIcon size={40} />
        </span>
        <p className={s.appName}>{t('app.name')}</p>
      </div>
      <section className={s.card} aria-labelledby="admin-login-title">
        <h1 id="admin-login-title">{t('admin.login.title')}</h1>
        <p className={s.subtitle}>{t('admin.login.subtitle')}</p>
        <form className={s.form} onSubmit={submit} noValidate>
          <Input
            label={t('admin.login.emailLabel')}
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required={USE_API}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
            }}
            error={errors.email}
          />
          <Input
            label={t('admin.login.passwordLabel')}
            type="password"
            autoComplete="current-password"
            required={USE_API}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((er) => ({ ...er, password: undefined }));
            }}
            error={errors.password}
          />
          <Button type="submit" size="lg" block loading={busy}>
            {t('admin.login.submit')}
          </Button>
        </form>
        {!USE_API && <p className={s.note}>{t('admin.login.mockNote')}</p>}
      </section>
    </main>
  );
}
