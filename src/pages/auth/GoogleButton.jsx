import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { Button, Spinner } from '../../components/ui/index.js';
import { GOOGLE_CLIENT_ID, decodeGoogleCredential, loadGoogleScript } from '../../services/google.js';
import s from './SignIn.module.css';

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
  const [state, setState] = useState('loading'); // loading | ready | error | unconfigured | origin
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
          // Without this, Google rejecting the address the app is served from
          // shows "Error 400: origin_mismatch" inside its own popup and the app
          // never hears about it — the button just sits there looking fine.
          // That is a configuration mistake, not a user one, so say which
          // address needs adding rather than blaming the person's connection.
          error_callback: (err) => {
            setState(err?.type === 'unregistered_origin' ? 'origin' : 'error');
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
      {state === 'origin' && !busy && (
        <div className={s.googleError} role="alert">
          <p>{t('errors.GOOGLE_ORIGIN', { origin: typeof window !== 'undefined' ? window.location.origin : '' })}</p>
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
