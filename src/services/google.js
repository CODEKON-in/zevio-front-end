/**
 * Google sign-in, through Google Identity Services.
 *
 * VITE_GOOGLE_CLIENT_ID must be set (.env.local locally, Netlify in production)
 * and the site's address listed under "Authorized JavaScript origins" for that
 * OAuth client. Google returns a signed ID token; the person's Google id, email,
 * name and photo are read from it. Without a client ID
 * the button reports that it is not configured rather than faking a sign-in.
 *
 * SECURITY: decodeGoogleCredential below only DECODES the token — it proves
 * nothing, so it is used for filling in the sign-up form and nothing else.
 * Who someone actually is comes from POST /api/auth/google, where the API
 * checks the signature, issuer and audience against Google's public keys.
 * Never decide anything from the decoded token alone.
 */
import { ServiceError } from '../utils/errors.js';

/**
 * This app's Google OAuth client. A client ID is NOT a secret — it is sent to
 * Google on every sign-in and is readable in the JS bundle either way — so it
 * has a default here. That keeps sign-in working on a host where the build-time
 * variable was never set, which is exactly how production ended up reporting
 * "not set up for this site". VITE_GOOGLE_CLIENT_ID still overrides it.
 */
const DEFAULT_CLIENT_ID = '238941476634-p3kk1h8bgaosgkku7rm3omun16o83qt5.apps.googleusercontent.com';

/**
 * Every Google client ID looks like <digits>-<hash>.apps.googleusercontent.com.
 * Checking the shape costs nothing and catches the mistake that actually
 * happens: something other than the ID ends up in the variable — a file path,
 * the client *secret*, a quoted string, a stray trailing comment. Sent on to
 * Google, any of those come back as "Error 401: invalid_client", which reads
 * like the OAuth client is broken rather than like a typo in a .env file.
 */
const CLIENT_ID_SHAPE = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/;

function pickClientId() {
  const fromEnv = (import.meta.env?.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (!fromEnv) return DEFAULT_CLIENT_ID;
  if (CLIENT_ID_SHAPE.test(fromEnv)) return fromEnv;
  // Not a client ID. Say so once, name the offending value, and carry on with
  // the known-good default rather than guaranteeing a failed sign-in.
  console.error(
    `[Mynt] VITE_GOOGLE_CLIENT_ID is not a Google client ID: "${fromEnv}".\n` +
    '  It should look like 1234567890-abc123.apps.googleusercontent.com\n' +
    '  (Google Cloud Console -> APIs & Services -> Credentials -> your Web application client.)\n' +
    '  Falling back to the built-in client ID for now.',
  );
  return DEFAULT_CLIENT_ID;
}

export const GOOGLE_CLIENT_ID = pickClientId();

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
 * FALLBACK ONLY — used when the API has no POST /api/auth/google (the deployed
 * version does not). The same Google account always yields the same profile id
 * (a UUID), on every device, so the profile is found again without a verified
 * lookup.
 *
 * This trusts the `sub` the browser read out of the token, so it IDENTIFIES a
 * person without PROVING who they are. Once the API gains /api/auth/google the
 * verified path takes over automatically and this stops being used.
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
