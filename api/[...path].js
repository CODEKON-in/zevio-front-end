/**
 * Vercel Serverless Function — forwards the app's /api/* calls to the Zevio API
 * and adds the secret API key, so the key never reaches the browser.
 *
 * Vercel → this project → Settings → Environment Variables:
 *   ZEVIO_API_URL  e.g. https://zevio-apis.vercel.app
 *   ZEVIO_API_KEY  the API key (same value as API_KEY / ZEVIO_API_KEY in the
 *                  zevio-api project)
 *
 * Only the endpoints the app actually uses are let through, so a stray path
 * cannot reach admin-only parts of the API with this key attached.
 * (/api/admin/add/ is deliberately absent: creating an admin stays a
 * server-side call, never something a browser can do.)
 */
const ID = '[0-9a-fA-F-]{36}';
const SLUG = '[a-z0-9-]{2,100}';
const PHONE = '[0-9]{10}';

const ALLOWED = {
  GET: [
    '/api/shops/',
    `/api/shop/${ID}`,
    `/api/shop/slug/${SLUG}`,
    `/api/shops/by-profile/${ID}`,
    `/api/products/by-shop/${ID}`,
    `/api/product/${ID}`,
    `/api/product/slug/${SLUG}`,
    '/api/orders/',
    `/api/orders/by-customer/${ID}`,
    `/api/orders/by-shop/${ID}`,
    `/api/orders/by-partner/${ID}`,
    `/api/order/${ID}`,
    `/api/order/${ID}/items/`,
    '/api/order/items/',
    `/api/user/${ID}`,
    '/api/users/',
    `/api/user/by-phone/${PHONE}`,
    '/api/settings/',
    '/api/places/',
  ],
  POST: [
    '/api/user/add/',
    '/api/user/update/',
    '/api/user/delete/',
    '/api/shop/add/',
    '/api/shop/update/',
    '/api/shop/toggle-orders/',
    '/api/shop/set-active/',
    '/api/shop/delete/',
    '/api/product/add/',
    '/api/product/update/',
    '/api/product/toggle-availability/',
    '/api/product/delete/',
    '/api/order/place/',
    '/api/order/update-status/',
    '/api/order/cancel/',
    '/api/order/assign-partner/',
    '/api/order/mark-paid/',
    '/api/auth/admin',
    '/api/auth/google',
    '/api/settings/',
    '/api/place/add/',
    '/api/place/update/',
    '/api/place/delete/',
  ],
};

const RULES = Object.fromEntries(
  Object.entries(ALLOWED).map(([method, list]) => [method, list.map((p) => new RegExp(`^${p}$`))]),
);

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).end(typeof body === 'string' ? body : JSON.stringify(body));
}

/**
 * The request body, ready to forward.
 *
 * Vercel's Node runtime parses JSON and form bodies into `req.body` before the
 * handler runs, which drains the stream — so reading the raw stream first would
 * give nothing. Re-encode what was parsed, and only fall back to the stream for
 * content types Vercel left alone.
 */
async function readBody(req) {
  const type = req.headers['content-type'] || '';

  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) return req.body;
    if (type.includes('application/x-www-form-urlencoded')) {
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(req.body)) {
        if (v !== undefined && v !== null) form.append(k, String(v));
      }
      return form.toString();
    }
    return JSON.stringify(req.body);
  }

  return await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const base = (process.env.ZEVIO_API_URL || '').replace(/\/+$/, '');
  const key = process.env.ZEVIO_API_KEY;
  if (!base || !key) {
    return send(res, 500, { status: 'server not configured: set ZEVIO_API_URL and ZEVIO_API_KEY' });
  }

  // Prefer the original URL: it keeps the trailing slash, which most of these
  // endpoints require. Vercel's catch-all param splits on "/" and drops it, so
  // rebuilding from it alone turns /api/settings/ into /api/settings.
  let pathname;
  let search = '';
  const original = typeof req.url === 'string' ? req.url : '';
  if (original.startsWith('/api/')) {
    const parsed = new URL(original, 'http://proxy.local');
    pathname = parsed.pathname;
    parsed.searchParams.delete('path');
    search = parsed.searchParams.toString();
  } else {
    const parts = req.query.path;
    pathname = `/api/${Array.isArray(parts) ? parts.join('/') : parts || ''}`;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'path') continue;
      for (const one of Array.isArray(v) ? v : [v]) qs.append(k, one);
    }
    search = qs.toString();
  }

  // Match with and without the trailing slash, so neither spelling is refused.
  const rules = RULES[req.method];
  const candidates = pathname.endsWith('/')
    ? [pathname, pathname.slice(0, -1)]
    : [pathname, `${pathname}/`];
  if (!rules || !candidates.some((c) => rules.some((r) => r.test(c)))) {
    return send(res, 404, { status: 'endpoint not allowed' });
  }

  // Send the spelling the API actually declares, so a missing or extra slash
  // never becomes a 404 upstream.
  const matched = candidates.find((c) => rules.some((r) => r.test(c))) || pathname;
  const url = base + matched + (search ? `?${search}` : '');

  const headers = { 'X-API-Key': key, Accept: 'application/json' };
  const type = req.headers['content-type'];
  if (type) headers['content-type'] = type;

  try {
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
    const upstream = await fetch(url, { method: req.method, headers, body });
    const text = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.status(upstream.status).end(text);
  } catch {
    send(res, 502, { status: 'api unreachable' });
  }
}
