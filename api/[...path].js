/**
 * Vercel Serverless Function — proxies every /api/* request from the frontend
 * to the Zevio API (hosted separately at ZEVIO_API_URL) and injects the secret
 * API key so it never reaches the browser.
 *
 * Set these in Vercel → Project (frontend) → Settings → Environment Variables:
 *   ZEVIO_API_URL = https://zevio-apis.vercel.app
 *   ZEVIO_API_KEY = <the API_KEY from the zevio-api Vercel project>
 */

export const config = { api: { bodyParser: false } };

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).end(typeof body === 'string' ? body : JSON.stringify(body));
}

export default async function handler(req, res) {
  const base = (process.env.ZEVIO_API_URL || '').replace(/\/+$/, '');
  const key  = process.env.ZEVIO_API_KEY;

  if (!base || !key) return send(res, 500, { status: 'server not configured' });

  // Rebuild the /api/... path from Vercel's catch-all param
  const parts   = req.query.path;
  const pathname = '/api/' + (Array.isArray(parts) ? parts.join('/') : parts);

  // Forward query string (minus the internal "path" param)
  const qs = new URLSearchParams(
    Object.entries(req.query).filter(([k]) => k !== 'path'),
  ).toString();
  const upstreamUrl = base + pathname + (qs ? `?${qs}` : '');

  const headers = { 'X-API-Key': key, Accept: 'application/json' };
  const ct = req.headers['content-type'];
  if (ct) headers['content-type'] = ct;

  try {
    // Collect raw body for POST requests
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end',  () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
    }

    const upstream = await fetch(upstreamUrl, { method: req.method, headers, body });
    const text = await upstream.text();

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.status(upstream.status).end(text);
  } catch {
    send(res, 502, { status: 'api unreachable' });
  }
}
