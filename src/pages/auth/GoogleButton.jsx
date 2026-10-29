import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { BottomSheet, Button, Input, Spinner } from '../../components/ui/index.js';
import { ChevronRightIcon } from '../../components/icons/Icons.jsx';
import { GOOGLE_CLIENT_ID, USE_REAL_GOOGLE, decodeGoogleCredential, loadGoogleScript } from '../../services/google.js';
import { getDemoGoogleAccounts } from '../../services/accountService.js';
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

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * GoogleButton — "Continue with Google".
 * Props:
 *  - role: which account list the demo chooser shows
 *  - onSuccess({ sub, email, name, picture }) — the Google account picked
 *  - busy: shows a spinner while the app signs in
 */
export default function GoogleButton({ role, onSuccess, busy }) {
  return USE_REAL_GOOGLE ? <RealGoogleButton onSuccess={onSuccess} busy={busy} /> : <DemoGoogleButton role={role} onSuccess={onSuccess} busy={busy} />;
}

/* ---------- real Google Identity Services button ---------- */

function RealGoogleButton({ onSuccess, busy }) {
  const holder = useRef(null);
  const latest = useRef(onSuccess);
  latest.current = onSuccess;
  const [state, setState] = useState('loading'); // loading | ready | error
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
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

/* ---------- demo chooser (no Google client ID configured) ---------- */

function DemoGoogleButton({ role, onSuccess, busy }) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState(null);
  const [other, setOther] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setAccounts(null);
    setOther(false);
    getDemoGoogleAccounts(role)
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, [open, role]);

  const pick = (account) => {
    setOpen(false);
    const email = account.email.trim().toLowerCase();
    onSuccess({ sub: `demo:${email}`, email, name: account.name || email.split('@')[0], picture: null });
  };

  const submitOther = (e) => {
    e.preventDefault();
    const er = {};
    if (!form.name.trim()) er.name = t('auth.nameError');
    if (!EMAIL.test(form.email.trim())) er.email = t('auth.emailError');
    setErrors(er);
    if (!Object.keys(er).length) pick({ name: form.name.trim(), email: form.email });
  };

  return (
    <>
      <Button variant="outline" size="lg" block iconLeft={<GoogleMark />} loading={busy} onClick={() => setOpen(true)}>
        {t('auth.google')}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t('auth.chooseAccount')}>
        <p className={s.demoNote}>{t('auth.demoNote')}</p>
        {!other ? (
          <ul className={s.accounts}>
            {accounts === null && (
              <li className={s.googleStatus}>
                <Spinner size={20} />
              </li>
            )}
            {accounts?.map((a) => (
              <li key={a.email}>
                <button type="button" className={s.account} onClick={() => pick(a)}>
                  <span className={s.avatar} aria-hidden="true">
                    {(a.name || a.email).charAt(0).toUpperCase()}
                  </span>
                  <span className={s.accountText}>
                    <span className={s.accountName}>{a.name || a.email}</span>
                    <span className={s.accountEmail}>
                      {a.email}
                      {a.note ? ` · ${a.note}` : ''}
                    </span>
                  </span>
                  <ChevronRightIcon size={18} />
                </button>
              </li>
            ))}
            <li>
              <button type="button" className={s.account} onClick={() => setOther(true)}>
                <span className={`${s.avatar} ${s.avatarPlus}`} aria-hidden="true">
                  +
                </span>
                <span className={s.accountText}>
                  <span className={s.accountName}>{t('auth.otherAccount')}</span>
                </span>
                <ChevronRightIcon size={18} />
              </button>
            </li>
          </ul>
        ) : (
          <form className={s.otherForm} onSubmit={submitOther} noValidate>
            <Input label={t('auth.otherName')} autoComplete="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={errors.name} />
            <Input
              label={t('auth.otherEmail')}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              error={errors.email}
            />
            <Button type="submit" size="lg" block>
              {t('auth.continue')}
            </Button>
          </form>
        )}
      </BottomSheet>
    </>
  );
}
