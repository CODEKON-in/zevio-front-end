/**
 * Google sign-in, through Google Identity Services.
 *
 * VITE_GOOGLE_CLIENT_ID must be set (.env.local locally, Netlify in production)
 * and the site's address listed under "Authorized JavaScript origins" for that
 * OAuth client. Google returns a signed ID token; the person's Google id, email,
 * name and photo are read from it. There is no demo chooser: without a client ID
 * the button reports that it is not configured rather than faking a sign-in.
 *
 * SECURITY: decodeGoogleCredential below only DECODES the token — it proves
 * nothing, so it is used for filling in the sign-up form and nothing else.
 * Who someone actually is comes from POST /api/auth/google, where the API
 * checks the signature, issuer and audience against Google's public keys.
 * Never decide anything from the decoded token alone.
 */
import { ServiceError } from '../utils/mock.js';

// The Google OAuth Client ID is a public value — it is sent to Google's servers
// and visible to anyone in DevTools. The secret never leaves Google's side.
// Hardcoded here so the button works even when the env var is not set in Vercel.
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '238941476634-p3kk1h8bgaosgkku7rm3omun16o83qt5.apps.googleusercontent.com';

let gisPromise = null;

/** Loads Google's sign-in script once. */
export function loadGoogleScript() {
  if (typeof window !== 'undefined' && window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = 'https://accounts.google.com/gsi/client';
      el.async = true;
      el.defer = true;
      el.onload = () => (window.google?.accounts?.id ? resolve(window.google) : reject(new ServiceError('GOOGLE_FAILED')));
      el.onerror = () => {
        gisPromise = null;
        reject(new ServiceError('GOOGLE_FAILED'));
      };
      document.head.appendChild(el);
    });
  }
  return gisPromise;
}

/** Reads the person from a Google ID token (JWT). */
export function decodeGoogleCredential(credential) {
  try {
    const part = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '='))
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    const p = JSON.parse(json);
    if (!p.sub || !p.email) throw new Error('missing');
    return { sub: p.sub, email: String(p.email).toLowerCase(), name: p.name || p.given_name || '', picture: p.picture || null, credential };
  } catch {
    throw new ServiceError('GOOGLE_FAILED');
  }
}

/** After logout, stop Google from signing the same account in automatically. */
export function googleSignOut() {
  try {
    window.google?.accounts?.id?.disableAutoSelect();
  } catch {
    /* not loaded */
  }
}
