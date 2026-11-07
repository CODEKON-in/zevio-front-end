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

// Only what the customer app calls. Everything that changes shops, products,
// orders' status, users or settings is NOT here: there is no admin panel, so
// nothing on this site may make those calls (manage that data in the database
// directly, or with scripts/seed-demo-shop.mjs from your own computer).
const ALLOWED = {
  GET: [
    '/api/shops/',
    `/api/shop/${ID}`,
    `/api/products/by-shop/${ID}`,
    `/api/orders/by-customer/${ID}`,
    `/api/order/${ID}`,
    `/api/order/${ID}/items/`,
    '/api/order/items/',
    `/api/user/${ID}`,
    '/api/settings/',
    '/api/places/',
  ],
  POST: [
    '/api/user/add/',
    '/api/user/delete/',
    '/api/order/place/',
    '/api/order/cancel/',
    '/api/auth/google',
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
  // Accept the obvious spellings: the API project calls the key API_KEY, so that
  // is the name most likely to have been pasted into this project by mistake.
  // One misnamed variable should not take the whole shop down.
  const base = (process.env.ZEVIO_API_URL || process.env.API_URL || 'https://zevio-apis.vercel.app').replace(/\/+$/, '');
  const key = process.env.ZEVIO_API_KEY || process.env.API_KEY || process.env.VITE_ZEVIO_API_KEY;

  // The path being asked for.
  //
  // This file is reached through a rewrite in vercel.json, which hands the real
  // path over as ?path=... . That rewrite exists because a file named
  // api/[...path].js is NOT treated as a catch-all here: it matched /api/one
  // but never /api/auth/google, so every two-segment call — sign-in, sign-up,
  // every POST the app makes — fell through to Vercel's own 404 and the app
  // reported "We could not find that". One static filename plus one rewrite
  // removes that whole class of failure, at any depth, with or without a
  // trailing slash.
  const parsed = new URL(typeof req.url === 'string' ? req.url : '/', 'http://proxy.local');
  const routed = parsed.searchParams.get('path') ?? (typeof req.query?.path === 'string' ? req.query.path : null);
  const pathname = routed === null
    ? parsed.pathname                               // the function hit directly
    : `/api/${routed.replace(/^\/+/, '')}`;         // the usual: through the rewrite
  parsed.searchParams.delete('path');
  const search = parsed.searchParams.toString();

  // GET /api/health/ — says whether this deployment is wired up, WITHOUT ever
  // revealing the key. Open it in a browser to tell the three failures apart:
  // function not deployed (Vercel's own 404), key missing (configured: false),
  // or the key not matching the API (upstream: 401).
  if (req.method === 'GET' && /^\/api\/health\/?$/.test(pathname)) {
    let upstream = null;
    if (base && key) {
      try {
        const probe = await fetch(`${base}/api/settings/`, { headers: { 'X-API-Key': key, Accept: 'application/json' } });
        upstream = probe.status;
      } catch {
        upstream = 'unreachable';
      }
    }
    return send(res, 200, {
      status: 'ok',
      proxy: 'deployed',
      api_url: base || null,
      key_configured: Boolean(key),
      key_name: process.env.ZEVIO_API_KEY ? 'ZEVIO_API_KEY' : process.env.API_KEY ? 'API_KEY' : process.env.VITE_ZEVIO_API_KEY ? 'VITE_ZEVIO_API_KEY' : null,
      key_fingerprint: key ? `${key.slice(0, 6)}…${key.slice(-4)} (${key.length} chars)` : null,
      upstream_settings_status: upstream,
    });
  }

  if (!base || !key) {
    return send(res, 500, { status: 'server not configured: set ZEVIO_API_URL and ZEVIO_API_KEY' });
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
