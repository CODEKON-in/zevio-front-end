/**
 * Netlify Edge Function: forwards the app's /api/* calls to the Zevio API and
 * adds the secret API key, so the key never reaches the browser.
 *
 * Netlify → Site configuration → Environment variables:
 *   ZEVIO_API_URL  e.g. https://zevio-apis.vercel.app
 *   ZEVIO_API_KEY  the API key (same value as API_KEY in the API's secrets.env)
 *
 * Only the endpoints the app actually uses are let through (no delete-order,
 * order-item changes…).
 */
const ID = '[0-9a-fA-F-]{36}';
const SLUG = '[a-z0-9-]{2,100}';
const ALLOWED = {
  GET: [
    '/api/shops/',
    `/api/shop/${ID}`,
    `/api/shop/slug/${SLUG}`,
    `/api/products/by-shop/${ID}`,
    `/api/product/${ID}`,
    `/api/product/slug/${SLUG}`,
    `/api/orders/by-customer/${ID}`,
    `/api/orders/by-shop/${ID}`,
    `/api/order/${ID}`,
    `/api/order/${ID}/items/`,
    `/api/user/${ID}`,
    `/api/shops/by-profile/${ID}`,
  ],
  POST: [
    '/api/user/add/',
    '/api/user/update/',
    '/api/shop/add/',
    '/api/shop/update/',
    '/api/shop/toggle-orders/',
    '/api/product/add/',
    '/api/product/update/',
    '/api/product/toggle-availability/',
    '/api/product/delete/',
    '/api/order/place/',
    '/api/order/update-status/',
    '/api/order/cancel/',
    // "Delete my account" (customer, shop owner)
    '/api/user/delete/',
    '/api/shop/delete/',
  ],
};
const RULES = Object.fromEntries(Object.entries(ALLOWED).map(([m, list]) => [m, list.map((p) => new RegExp(`^${p}$`))]));

const json = (status, code) =>
  new Response(JSON.stringify({ status }), { status: code, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (request) => {
  const url = new URL(request.url);
  const rules = RULES[request.method];
  if (!rules || !rules.some((r) => r.test(url.pathname))) return json('endpoint not allowed', 404);

  const base = (Netlify.env.get('ZEVIO_API_URL') || '').replace(/\/+$/, '');
  const key = Netlify.env.get('ZEVIO_API_KEY');
  if (!base || !key) return json('server not configured', 500);

  const headers = new Headers({ 'X-API-Key': key, Accept: 'application/json' });
  const type = request.headers.get('content-type');
  if (type) headers.set('content-type', type);

  try {
    const upstream = await fetch(base + url.pathname + url.search, {
      method: request.method,
      headers,
      body: request.method === 'POST' ? await request.arrayBuffer() : undefined,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' },
    });
  } catch {
    return json('api unreachable', 502);
  }
};

export const config = { path: '/api/*' };
