import { t } from '../../i18n/index.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { Button, Spinner } from '../../components/ui/index.js';
import MyntLogo from '../../components/brand/MyntLogo.jsx';
import s from '../../styles/login.module.css';

/** Google's "G", drawn in Google's own colours as their sign-in guidelines ask. */
function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/**
 * Admin login: the Mynt logo and one button, "Continue with Google". There is
 * no sign-up — only Gmail addresses a superadmin has invited (Access page) get
 * in; anyone else is signed straight back out with "no access".
 */
export default function AdminLogin() {
  const { status, error, signIn } = useAdminAuth();
  const checking = status === 'checking';

  return (
    <main className={s.page}>
      <div className={s.hero}>
        <MyntLogo size={44} variant="onMango" className={s.logo} />
      </div>
      <section className={s.card} aria-labelledby="admin-login-title">
        <h1 id="admin-login-title">{t('admin.login.title')}</h1>
        <p className={s.subtitle}>{t('admin.login.subtitle')}</p>

        {status === 'unconfigured' ? (
          <p className={s.error} role="alert">
            {t('admin.login.notConfigured')}
          </p>
        ) : checking ? (
          <p className={s.subtitle} role="status">
            <Spinner size={18} /> {t('admin.login.checking')}
          </p>
        ) : (
          <>
            {status === 'denied' && (
              <p className={s.error} role="alert">
                {t('admin.login.noAccess')}
              </p>
            )}
            {error && status !== 'denied' && (
              <p className={s.error} role="alert">
                {t('admin.login.failed')}
              </p>
            )}
            <Button variant="outline" size="lg" block iconLeft={<GoogleG />} onClick={signIn}>
              {t('admin.login.google')}
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
