/**
 * Tiny client for the Zevio API.
 *
 * The browser NEVER sees the API key: it calls same-site `/api/...` and the proxy
 * (Vite dev server locally, a Netlify function in production) adds `X-API-Key`
 * and forwards to the real API. That also avoids CORS.
 *
 * API replies look like { status: 'ok' | '<error text>', data?, csrf }.
 */
import { ServiceError } from '../../utils/errors.js';

const TIMEOUT_MS = 15000;

/*
 * Admin requests carry the signed-in admin's Firebase ID token. The admin
 * panel registers where to get it (AdminAuthContext); the customer app never
 * does, so its requests are unchanged. The site's /api proxy checks the token
 * and the admin's role before an admin-only call reaches the API.
 */
let tokenProvider = null;
export function setAuthTokenProvider(fn) {
  tokenProvider = fn;
}

function toError(httpStatus, message) {
  // The proxy's admin checks say "admin: …" (signed out, not allowed, not your shop).
  if (String(message).startsWith('admin:')) return new ServiceError(httpStatus === 401 ? 'ADMIN_SIGNED_OUT' : 'ADMIN_FORBIDDEN', message);
  if (httpStatus === 404) return new ServiceError('NOT_FOUND', message);
  if (httpStatus === 401 || httpStatus === 403) return new ServiceError('API_AUTH', message);
  return new ServiceError('SERVER', message);
}

async function call(method, path, fields) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ServiceError('NETWORK');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    const init = { method, headers: { Accept: 'application/json' }, signal: ctrl.signal };
    const token = tokenProvider ? await tokenProvider().catch(() => null) : null;
    if (token) init.headers.Authorization = `Bearer ${token}`;
    if (fields) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body.append(k, typeof v === 'boolean' ? String(v) : String(v));
      }
      init.body = body;
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new ServiceError('NETWORK');
  } finally {
    clearTimeout(timer);
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* not JSON (e.g. proxy error page) */
  }
  if (!res.ok || !json || json.status !== 'ok') {
    const message = json?.status || `HTTP ${res.status}`;
    if (import.meta.env.DEV) console.warn(`[api] ${method} ${path} → ${res.status} ${message}`);
    throw toError(res.status, message);
  }
  return json.data;
}

/** GET /api{path}?{params} */
export function apiGet(path, params) {
  const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString() : '';
  return call('GET', qs ? `${path}?${qs}` : path);
}

/** POST /api{path} with form fields */
export function apiPost(path, fields) {
  return call('POST', path, fields);
}
