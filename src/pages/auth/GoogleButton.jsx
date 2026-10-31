import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { Button, Spinner } from '../../components/ui/index.js';
import { GOOGLE_CLIENT_ID, decodeGoogleCredential, loadGoogleScript } from '../../services/google.js';
import s from './SignIn.module.css';

export function GoogleMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/**
 * GoogleButton — "Continue with Google", using Google Identity Services.
 *
 * A real Google account is the only way in.
 * If VITE_GOOGLE_CLIENT_ID is missing the button says so plainly rather than
 * pretending to sign anyone in.
 *
 * Props:
 *  - onSuccess({ sub, email, name, picture, credential }) — the Google account
 *  - busy: shows a spinner while the app signs in
 */
export default function GoogleButton({ onSuccess, busy }) {
  const holder = useRef(null);
  const latest = useRef(onSuccess);
  latest.current = onSuccess;
  const [state, setState] = useState('loading'); // loading | ready | error | unconfigured
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setState('unconfigured');
      return undefined;
    }
    let alive = true;
    setState('loading');
    loadGoogleScript()
      .then((google) => {
        if (!alive || !holder.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          callback: (res) => {
            try {
              latest.current(decodeGoogleCredential(res.credential));
            } catch {
              setState('error');
            }
          },
        });
        holder.current.innerHTML = '';
        google.accounts.id.renderButton(holder.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          width: Math.min(holder.current.offsetWidth || 320, 400),
        });
        setState('ready');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [attempt]);

  return (
    <div className={s.googleWrap} aria-busy={busy || state === 'loading'}>
      <div ref={holder} className={s.googleHolder} hidden={state !== 'ready' || busy} />
      {(state === 'loading' || busy) && (
        <p className={s.googleStatus}>
          <Spinner size={20} /> {busy ? '' : t('auth.googleLoading')}
        </p>
      )}
      {state === 'unconfigured' && (
        <div className={s.googleError} role="alert">
          <p>{t('errors.GOOGLE_NOT_CONFIGURED')}</p>
        </div>
      )}
      {state === 'error' && !busy && (
        <div className={s.googleError} role="alert">
          <p>{t('errors.GOOGLE_FAILED')}</p>
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            {t('common.retry')}
          </Button>
        </div>
      )}
    </div>
  );
}
