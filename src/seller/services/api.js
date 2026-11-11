/**
 * Client for the Zevio seller API (/api/seller/*).
 *
 * Calls go to this site's own /api path. A small proxy (api/proxy.js in
 * production, the Vite dev server locally) forwards them to the Zevio API and
 * adds the secret X-API-Key, so the key is never in the browser. The seller's
 * identity travels as their Google ID token (Authorization: Bearer).
 */

const SESSION_KEY = 'mynt_seller_session';
export const AUTH_EXPIRED_EVENT = 'mynt-auth-expired';

/* ---------------- session (the Google ID token) ---------------- */

function tokenExpiry(credential) {
  try {
    const part = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '='))).exp * 1000;
  } catch {
    return 0;
  }
}

export function saveSession(credential) {
  try {
    sessionStorage.setItem(SESSION_KEY, credential);
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
  memoryCredential = credential;
}

let memoryCredential = null;

export function getCredential() {
  let credential = memoryCredential;
  if (!credential) {
    try {
      credential = sessionStorage.getItem(SESSION_KEY);
    } catch {
      credential = null;
    }
  }
  if (!credential || tokenExpiry(credential) <= Date.now()) return null;
  return credential;
}

export function clearSession() {
  memoryCredential = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------------- requests ---------------- */

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest(path, { method = 'GET', form, query } = {}) {
  const credential = getCredential();
  if (!credential) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const init = { method, headers: { Authorization: `Bearer ${credential}`, Accept: 'application/json' } };
  if (form) {
    const body = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null) body.append(k, String(v));
    });
    init.body = body;
  }

  let res;
  try {
    res = await fetch(`/api/seller${path}${qs}`, init);
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page */
  }

  if (res.status === 401) {
    clearSession();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  if (!res.ok || !body || body.status !== 'ok') {
    throw new ApiError((body && body.status) || `Request failed (${res.status})`, res.status);
  }
  return body.data;
}

/* ---------------- polling (replaces live listeners) ---------------- */

const refreshers = new Set();

/** Re-fetch every active poller now — called after a change is saved. */
export function refreshAll() {
  refreshers.forEach((fn) => fn());
}

/**
 * Calls `fetcher` now and every `intervalMs`, passing each result to `onData`
 * or the failure to `onError`. Returns an unsubscribe function. Paused while
 * the tab is hidden.
 */
export function poll(fetcher, onData, onError, intervalMs) {
  let active = true;
  let running = false;

  const tick = async () => {
    if (!active || running) return;
    running = true;
    try {
      const data = await fetcher();
      if (active) onData(data);
    } catch (err) {
      if (active) onError(err);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => {
    if (!document.hidden) tick();
  }, intervalMs);
  const onVisible = () => {
    if (!document.hidden) tick();
  };
  document.addEventListener('visibilitychange', onVisible);
  refreshers.add(tick);
  tick();

  return () => {
    active = false;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
    refreshers.delete(tick);
  };
}
