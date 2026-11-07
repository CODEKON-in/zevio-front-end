/**
 * Tests for the server-side admin check (api/_adminGuard.js) and its use in
 * the /api proxy (api/proxy.js), with real RS256 tokens signed by a test key.
 * Google's key endpoint, Firestore and the Mynt API are stood in for, so this
 * runs offline:   node scripts/test-admin-guard.mjs
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authorizeAdmin, adminRuleFor, resetCaches } from '../api/_adminGuard.js';

const PROJECT = 'mynt-test';
const SHOP_A = '11111111-1111-1111-1111-111111111111';
const SHOP_B = '22222222-2222-2222-2222-222222222222';
const PRODUCT_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const PRODUCT_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const ORDER_B = 'cccccccc-0000-0000-0000-000000000003';

// A throwaway signing key + self-signed certificate (what Google publishes).
const dir = mkdtempSync(join(tmpdir(), 'mynt-guard-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem'), '-days', '1', '-subj', '/CN=test'], { stdio: 'ignore' });
const KEY = readFileSync(join(dir, 'k.pem'), 'utf8');
const CERT = readFileSync(join(dir, 'c.pem'), 'utf8');
const OTHER = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;

const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token(claims = {}, { key = KEY, kid = 'k1', alg = 'RS256' } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = { iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: 'uid1', iat: now - 10, exp: now + 3600, auth_time: now - 10, email: 'owner@gmail.com', email_verified: true, ...claims };
  const head = enc({ alg, kid, typ: 'JWT' });
  const data = `${head}.${enc(body)}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(data), key).toString('base64url');
  return `${data}.${sig}`;
}

// The allowlist in "Firestore".
const ADMINS = {
  'waheedx212@gmail.com': { role: 'superadmin', active: true },
  'owner@gmail.com': { role: 'shop_owner', active: true, shopId: SHOP_A },
  'gone@gmail.com': { role: 'shop_owner', active: false, shopId: SHOP_A },
};
const fsDoc = (e) => ({ fields: { role: { stringValue: e.role }, active: { booleanValue: e.active }, ...(e.shopId ? { shopId: { stringValue: e.shopId } } : {}) } });
const json = (status, body, headers = {}) => ({ ok: status < 400, status, headers: { get: (h) => headers[h.toLowerCase()] }, json: async () => body, text: async () => JSON.stringify(body) });
const upstreamCalls = [];
async function fakeFetch(url, init = {}) {
  url = String(url);
  if (url.includes('securetoken@system.gserviceaccount.com')) return json(200, { k1: CERT }, { 'cache-control': 'public, max-age=3600' });
  if (url.startsWith('https://firestore.googleapis.com/')) {
    const email = decodeURIComponent(url.split('/adminUsers/')[1]);
    const auth = init.headers?.Authorization || '';
    if (!auth.startsWith('Bearer ')) return json(403, {});
    const e = ADMINS[email];
    return e ? json(200, fsDoc(e)) : json(404, {});
  }
  if (url.startsWith('https://api.test/')) {
    upstreamCalls.push({ url, method: init.method || 'GET', body: init.body ? String(init.body) : '' });
    if (url.endsWith(`/api/product/${PRODUCT_A}`)) return json(200, { status: 'ok', data: { id: PRODUCT_A, shop_id: SHOP_A } });
    if (url.endsWith(`/api/product/${PRODUCT_B}`)) return json(200, { status: 'ok', data: { id: PRODUCT_B, shop_id: SHOP_B } });
    if (url.endsWith(`/api/order/${ORDER_B}`)) return json(200, { status: 'ok', data: { id: ORDER_B, shop_id: SHOP_B } });
    return json(200, { status: 'ok', data: { done: true } });
  }
  throw new Error(`unexpected fetch ${url}`);
}

const results = [];
const check = (name, cond, detail = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  — ${detail}`}`);
const lookup = async (p) => (await (await fakeFetch(`https://api.test${p}`)).json()).data;
async function guard(method, path, { tok, form, projectId = PROJECT } = {}) {
  resetCaches();
  const rule = adminRuleFor(method, path);
  return authorizeAdmin({ rule, authorization: tok ? `Bearer ${tok}` : undefined, form: form ? new URLSearchParams(form) : null, pathname: path, projectId, lookup, fetchImpl: fakeFetch });
}
const SUPER = token({ email: 'waheedx212@gmail.com' });
const OWNER = token({ email: 'owner@gmail.com' });

// Classification
check('Customer calls are not admin calls (order/place, shops, products)', !adminRuleFor('POST', '/api/order/place/') && !adminRuleFor('GET', '/api/shops/') && !adminRuleFor('GET', `/api/products/by-shop/${SHOP_A}`));
check('Admin calls are recognised with or without the trailing slash', Boolean(adminRuleFor('POST', '/api/product/update')) && Boolean(adminRuleFor('POST', '/api/product/update/')));

// Tokens
check('No token → 401', (await guard('POST', '/api/settings/', {})).status === 401);
check('Garbage token → 401', (await guard('POST', '/api/settings/', { tok: 'a.b.c' })).status === 401);
check('Token signed by another key → 401', (await guard('POST', '/api/settings/', { tok: token({ email: 'waheedx212@gmail.com' }, { key: OTHER }) })).status === 401);
check('Token for another Firebase project → 401', (await guard('POST', '/api/settings/', { tok: token({ email: 'waheedx212@gmail.com', aud: 'evil' }) })).status === 401);
check('Expired token → 401', (await guard('POST', '/api/settings/', { tok: token({ email: 'waheedx212@gmail.com', exp: Math.floor(Date.now() / 1000) - 5 }) })).status === 401);
check('Unverified email → 401', (await guard('POST', '/api/settings/', { tok: token({ email: 'waheedx212@gmail.com', email_verified: false }) })).status === 401);
check('alg "none" trick → 401', (await guard('POST', '/api/settings/', { tok: token({ email: 'waheedx212@gmail.com' }, { alg: 'none' }) })).status === 401);
check('Server without FIREBASE_PROJECT_ID → 503 (fails closed)', (await guard('POST', '/api/settings/', { tok: SUPER, projectId: '' })).status === 503);

// Allowlist
check('Valid Google token but not invited → 403 no access', (await guard('POST', '/api/settings/', { tok: token({ email: 'stranger@gmail.com' }) })).message === 'admin: no access');
check('Deactivated user → 403', (await guard('POST', `/api/shop/toggle-orders/`, { tok: token({ email: 'gone@gmail.com' }), form: { shop_id: SHOP_A } })).status === 403);
check('Email case does not matter (Waheedx212@Gmail.com)', (await guard('POST', '/api/settings/', { tok: token({ email: 'Waheedx212@Gmail.com' }) })).ok === true);

// Superadmin
check('Superadmin: platform settings OK', (await guard('POST', '/api/settings/', { tok: SUPER })).ok);
check('Superadmin: any shop OK', (await guard('POST', '/api/shop/toggle-orders/', { tok: SUPER, form: { shop_id: SHOP_B } })).ok);
check('Superadmin: customers list OK', (await guard('GET', '/api/users/', { tok: SUPER })).ok);

// Shop owner
check('Owner: own shop open/closed OK', (await guard('POST', '/api/shop/toggle-orders/', { tok: OWNER, form: { shop_id: SHOP_A } })).ok);
check('Owner: OTHER shop open/closed → 403', (await guard('POST', '/api/shop/toggle-orders/', { tok: OWNER, form: { shop_id: SHOP_B } })).message === 'admin: not your shop');
check('Owner: add product to own shop OK', (await guard('POST', '/api/product/add/', { tok: OWNER, form: { shop_id: SHOP_A, name: 'x', price: '10' } })).ok);
check('Owner: add product to OTHER shop → 403', (await guard('POST', '/api/product/add/', { tok: OWNER, form: { shop_id: SHOP_B } })).status === 403);
check('Owner: edit own product OK (shop looked up)', (await guard('POST', '/api/product/update/', { tok: OWNER, form: { product_id: PRODUCT_A, price: '12' } })).ok);
check("Owner: edit another shop's product → 403", (await guard('POST', '/api/product/update/', { tok: OWNER, form: { product_id: PRODUCT_B, price: '1' } })).status === 403);
check("Owner: delete another shop's product → 403", (await guard('POST', '/api/product/delete/', { tok: OWNER, form: { product_id: PRODUCT_B } })).status === 403);
check("Owner: change another shop's order status → 403", (await guard('POST', '/api/order/update-status/', { tok: OWNER, form: { order_id: ORDER_B, status: 'cancelled' } })).status === 403);
check('Owner: own orders list OK', (await guard('GET', `/api/orders/by-shop/${SHOP_A}`, { tok: OWNER })).ok);
check("Owner: other shop's orders → 403", (await guard('GET', `/api/orders/by-shop/${SHOP_B}`, { tok: OWNER })).status === 403);
check('Owner: all orders → 403', (await guard('GET', '/api/orders/', { tok: OWNER })).status === 403);
check('Owner: customers list → 403', (await guard('GET', '/api/users/', { tok: OWNER })).status === 403);
check('Owner: platform settings → 403', (await guard('POST', '/api/settings/', { tok: OWNER })).status === 403);
check('Owner: create a shop → 403', (await guard('POST', '/api/shop/add/', { tok: OWNER })).status === 403);
check('Owner: edit own shop details OK', (await guard('POST', '/api/shop/update/', { tok: OWNER, form: { shop_id: SHOP_A, shop_name: 'New name' } })).ok);
check('Owner: cannot change own subscription or visibility', (await guard('POST', '/api/shop/update/', { tok: OWNER, form: { shop_id: SHOP_A, subscription_status: 'ACTIVE', is_active: 'true' } })).status === 403);
check("Owner: product_id missing → 403 (can't be matched to a shop)", (await guard('POST', '/api/product/update/', { tok: OWNER, form: { price: '1' } })).status === 403);

// Through the real proxy handler
process.env.ZEVIO_API_URL = 'https://api.test';
process.env.ZEVIO_API_KEY = 'server-key';
process.env.FIREBASE_PROJECT_ID = PROJECT;
globalThis.fetch = fakeFetch;
const { default: handler } = await import('../api/proxy.js');
async function viaProxy(method, path, { tok, form } = {}) {
  resetCaches();
  upstreamCalls.length = 0;
  const req = { method, url: `/api/proxy?path=${encodeURIComponent(path.replace(/^\/api\//, ''))}`, headers: { 'content-type': 'application/x-www-form-urlencoded', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: form || undefined };
  const out = { status: 0, body: '' };
  const res = { setHeader() {}, status(c) { out.status = c; return res; }, end(b) { out.body = b; } };
  await handler(req, res);
  return { ...out, forwarded: upstreamCalls.filter((c) => !/\/api\/(product|order)\/[0-9a-f-]{36}$/.test(c.url)) };
}
let r = await viaProxy('POST', '/api/product/update/', { tok: OWNER, form: { product_id: PRODUCT_B, price: '1' } });
check("Proxy: owner editing another shop's product is refused and never reaches the API", r.status === 403 && r.forwarded.length === 0, JSON.stringify(r));
r = await viaProxy('POST', '/api/product/update/', { tok: OWNER, form: { product_id: PRODUCT_A, price: '12' } });
check('Proxy: owner editing their own product is forwarded with the server key', r.status === 200 && r.forwarded.length === 1 && r.forwarded[0].body.includes('price=12'), JSON.stringify(r));
r = await viaProxy('POST', '/api/settings/', { form: { delivery_fee: '0' } });
check('Proxy: settings change with no sign-in → 401, not forwarded', r.status === 401 && r.forwarded.length === 0);
r = await viaProxy('POST', '/api/order/place/', { form: { shop_id: SHOP_A } });
check('Proxy: customer order/place still works without any admin token', r.status === 200 && r.forwarded.length === 1);
r = await viaProxy('POST', '/api/auth/admin', { form: { email: 'a', password: 'b' } });
check('Proxy: old email+password admin login is no longer let through', r.status === 404);

console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
