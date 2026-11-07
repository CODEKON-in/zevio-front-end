/**
 * Server-side admin check for the /api proxy (api/proxy.js).
 *
 * The admin panel signs in with Google through Firebase. Every admin-only call
 * must carry the admin's Firebase ID token (Authorization: Bearer …). Here we
 *   1. verify the token ourselves — RS256 signature against Google's published
 *      keys, audience/issuer = our Firebase project, not expired, email verified;
 *   2. read the caller's allowlist entry, Firestore adminUsers/{email}, using
 *      their own token (the Firestore rules let a user read only their own doc);
 *   3. allow the call only if the role fits — and, for a shop owner, only if
 *      the shop it touches is theirs (looked up from the API when the request
 *      names a product or an order rather than the shop).
 *
 * Customer endpoints are not listed here and pass through unchanged.
 * Files starting with "_" in api/ are not deployed as functions by Vercel.
 */
import crypto from 'node:crypto';

const ID = '([0-9a-fA-F-]{36})';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/**
 * Which calls are admin-only, and who may make them.
 *   super: superadmin only
 *   shop:  superadmin, or the shop owner of the shop named by `shop`:
 *          'path' (first id in the URL), 'body:<field>', 'product' (body
 *          product_id → that product's shop), 'order' (body order_id → its shop)
 */
export const ADMIN_ENDPOINTS = [
  { method: 'GET', path: '/api/orders/', who: 'super' },
  { method: 'GET', path: '/api/users/', who: 'super' },
  { method: 'GET', path: `/api/orders/by-partner/${ID}`, who: 'super' },
  { method: 'GET', path: `/api/orders/by-shop/${ID}`, who: 'shop', shop: 'path' },

  { method: 'POST', path: '/api/shop/add/', who: 'super' },
  { method: 'POST', path: '/api/shop/set-active/', who: 'super' },
  { method: 'POST', path: '/api/shop/delete/', who: 'super' },
  { method: 'POST', path: '/api/user/update/', who: 'super' },
  { method: 'POST', path: '/api/order/assign-partner/', who: 'super' },
  { method: 'POST', path: '/api/order/mark-paid/', who: 'super' },
  { method: 'POST', path: '/api/settings/', who: 'super' },
  { method: 'POST', path: '/api/place/add/', who: 'super' },
  { method: 'POST', path: '/api/place/update/', who: 'super' },
  { method: 'POST', path: '/api/place/delete/', who: 'super' },

  { method: 'POST', path: '/api/shop/update/', who: 'shop', shop: 'body:shop_id', ownerMayNotSet: ['is_active', 'subscription_plan', 'subscription_status', 'subscription_start', 'subscription_end', 'category', 'city', 'profile_id', 'slug'] },
  { method: 'POST', path: '/api/shop/toggle-orders/', who: 'shop', shop: 'body:shop_id' },
  { method: 'POST', path: '/api/product/add/', who: 'shop', shop: 'body:shop_id' },
  { method: 'POST', path: '/api/product/update/', who: 'shop', shop: 'product', ownerMayNotSet: ['shop_id'] },
  { method: 'POST', path: '/api/product/toggle-availability/', who: 'shop', shop: 'product' },
  { method: 'POST', path: '/api/product/delete/', who: 'shop', shop: 'product' },
  { method: 'POST', path: '/api/order/update-status/', who: 'shop', shop: 'order' },
].map((e) => ({ ...e, re: new RegExp(`^${e.path.replace(/\/$/, '')}/?$`) }));

/** The admin rule for this call, or null when it is not an admin-only call. */
export function adminRuleFor(method, pathname) {
  return ADMIN_ENDPOINTS.find((e) => e.method === method && e.re.test(pathname)) || null;
}

const deny = (status, message) => ({ ok: false, status, message: `admin: ${message}` });

/* ---------------- token verification ---------------- */

let certCache = { at: 0, maxAge: 0, certs: null };

async function googleCerts(fetchImpl, now) {
  if (certCache.certs && now - certCache.at < certCache.maxAge) return certCache.certs;
  const res = await fetchImpl(CERTS_URL);
  if (!res.ok) throw new Error('could not load Google signing keys');
  const certs = await res.json();
  const m = /max-age=(\d+)/.exec(res.headers?.get?.('cache-control') || '');
  certCache = { at: now, maxAge: (m ? Number(m[1]) : 3600) * 1000, certs };
  return certs;
}

/** For tests: forget the cached keys. */
export function resetCaches() {
  certCache = { at: 0, maxAge: 0, certs: null };
  roleCache.clear();
}

const b64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/**
 * Verify a Firebase ID token. Returns its claims, or throws.
 * Same checks as Firebase's own "verify ID tokens" guide, without a library.
 */
export async function verifyIdToken(token, projectId, { fetchImpl = fetch, now = Date.now() } = {}) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(b64(parts[0]).toString('utf8'));
  const claims = JSON.parse(b64(parts[1]).toString('utf8'));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('wrong algorithm');
  const certs = await googleCerts(fetchImpl, now);
  const pem = certs[header.kid];
  if (!pem) throw new Error('unknown key');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), crypto.createPublicKey(pem), b64(parts[2]));
  if (!ok) throw new Error('bad signature');
  const sec = Math.floor(now / 1000);
  if (claims.aud !== projectId) throw new Error('wrong audience');
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('wrong issuer');
  if (!claims.sub || typeof claims.sub !== 'string') throw new Error('no subject');
  if (typeof claims.exp !== 'number' || claims.exp <= sec) throw new Error('expired');
  if (typeof claims.iat !== 'number' || claims.iat > sec + 300) throw new Error('issued in the future');
  if (claims.email_verified !== true || !claims.email) throw new Error('email not verified');
  return claims;
}

/* ---------------- allowlist lookup ---------------- */

const roleCache = new Map(); // email → { at, entry }
const ROLE_TTL_MS = 30 * 1000;

async function adminEntry(email, token, projectId, fetchImpl, now) {
  const hit = roleCache.get(email);
  if (hit && now - hit.at < ROLE_TTL_MS) return hit.entry;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/adminUsers/${encodeURIComponent(email)}`;
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
  let entry = null;
  if (res.ok) {
    const f = (await res.json()).fields || {};
    entry = { role: f.role?.stringValue, active: f.active?.booleanValue === true, shopId: f.shopId?.stringValue || null };
  } else if (res.status !== 404 && res.status !== 403) {
    throw new Error(`allowlist unavailable (${res.status})`);
  }
  roleCache.set(email, { at: now, entry });
  return entry;
}

/* ---------------- the check ---------------- */

/**
 * Decide whether an admin-only call may go through.
 *   rule:          from adminRuleFor()
 *   authorization: the Authorization header
 *   form:          URLSearchParams of the request body (POST)
 *   pathname
 *   projectId:     Firebase project id (env FIREBASE_PROJECT_ID)
 *   lookup(path):  GET the API with the server key → data (for product/order → shop)
 */
export async function authorizeAdmin({ rule, authorization, form, pathname, projectId, lookup, fetchImpl = fetch, now = Date.now() }) {
  if (!projectId) return deny(503, 'sign-in is not configured on the server (FIREBASE_PROJECT_ID)');
  const token = /^Bearer\s+(.+)$/i.exec(authorization || '')?.[1];
  if (!token) return deny(401, 'sign in required');

  let claims;
  try {
    claims = await verifyIdToken(token, projectId, { fetchImpl, now });
  } catch {
    return deny(401, 'sign in required');
  }
  const email = String(claims.email).trim().toLowerCase();

  let entry;
  try {
    entry = await adminEntry(email, token, projectId, fetchImpl, now);
  } catch {
    return deny(503, 'could not check access, try again');
  }
  if (!entry || !entry.active) return deny(403, 'no access');
  if (entry.role === 'superadmin') return { ok: true, email, role: 'superadmin' };
  if (entry.role !== 'shop_owner' || !entry.shopId || rule.who !== 'shop') return deny(403, 'not allowed');

  // A shop owner: the call must be about their shop.
  let shopId = null;
  try {
    if (rule.shop === 'path') shopId = rule.re.exec(pathname)?.[1] || null;
    else if (rule.shop.startsWith('body:')) shopId = form?.get(rule.shop.slice(5)) || null;
    else if (rule.shop === 'product') {
      const id = form?.get('product_id');
      shopId = id ? (await lookup(`/api/product/${encodeURIComponent(id)}`))?.shop_id || null : null;
    } else if (rule.shop === 'order') {
      const id = form?.get('order_id');
      shopId = id ? (await lookup(`/api/order/${encodeURIComponent(id)}`))?.shop_id || null : null;
    }
  } catch {
    return deny(503, 'could not check the shop, try again');
  }
  if (!shopId || shopId !== entry.shopId) return deny(403, 'not your shop');

  if (rule.ownerMayNotSet && form) {
    const bad = rule.ownerMayNotSet.filter((k) => form.has(k));
    if (bad.length) return deny(403, `only the Mynt admin can change ${bad.join(', ')}`);
  }
  return { ok: true, email, role: 'shop_owner', shopId };
}
