/**
 * Google sign-in.
 *
 * - With VITE_GOOGLE_CLIENT_ID set (.env.local / Netlify), the real Google button
 *   (Google Identity Services) is used. It returns a signed ID token; we read the
 *   person's Google id, email, name and photo from it.
 * - Without it, a DEMO account chooser is shown instead, so the app can be tried
 *   without a Google Cloud project.
 *
 * NOTE: the browser cannot prove the token is genuine — the backend must verify it
 * (see BACKEND-CHANGES.md → "Google sign-in"). Until then this is identification,
 * not security.
 */
import { ServiceError } from '../utils/mock.js';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const USE_REAL_GOOGLE = Boolean(GOOGLE_CLIENT_ID);

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

/**
 * The same Google account always gives the same profile id (a UUID), on every
 * phone — so the API profile is found again without a "find by email" endpoint.
 * (cyrb128 hash; works on plain http too, unlike crypto.subtle.)
 */
export function profileIdFromGoogle(sub) {
  const str = `zevio:${sub}`;
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  const hex = [h1, h2, h3, h4].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
