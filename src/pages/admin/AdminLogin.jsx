import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input } from '../../components/ui/index.js';
import { SlidersIcon } from '../../components/icons/Icons.jsx';
import { ROLES } from '../../utils/constants.js';
import s from '../../styles/login.module.css';

/** MOCK admin login — any password works. */
export default function AdminLogin() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('admin@zevio.in');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(ROLES.ADMIN, { email });
    } catch (err) {
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
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
        <form className={s.form} onSubmit={submit}>
          <Input label={t('admin.login.emailLabel')} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label={t('admin.login.passwordLabel')} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" size="lg" block loading={busy}>
            {t('admin.login.submit')}
          </Button>
        </form>
        <p className={s.note}>{t('admin.login.mockNote')}</p>
      </section>
    </main>
  );
}
