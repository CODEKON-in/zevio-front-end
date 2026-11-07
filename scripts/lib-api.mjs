// Shared by the one-off scripts in this folder: read .env.local and call the
// Mynt API directly with the server key. Run them on your own computer only —
// the key never goes to the browser.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = { ...process.env };
  for (const name of ['.env.local', '.env']) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return env;
}

const env = loadEnv();
export const API_URL = (env.ZEVIO_API_URL || '').replace(/\/+$/, '');
const API_KEY = env.ZEVIO_API_KEY || '';

if (!API_URL || !API_KEY) {
  console.error('Missing ZEVIO_API_URL or ZEVIO_API_KEY. Put both in .env.local (the same values the app uses).');
  process.exit(1);
}

async function call(method, path, fields) {
  const init = { method, headers: { 'X-API-Key': API_KEY } };
  if (fields) {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) body.append(k, String(v));
    init.body = body;
  }
  const url = `${API_URL}${path.startsWith('/api') ? path : `/api${path}`}`;
  const res = await fetch(url, init);
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* not JSON */
  }
  return { ok: res.ok, status: res.status, data: json?.data, message: json?.status || json?.message || res.statusText };
}

export const get = (path) => call('GET', path);
export const post = (path, fields) => call('POST', path, fields);

/** Stop with a clear message when a call fails. */
export function must(result, what) {
  if (!result.ok) {
    console.error(`✗ ${what} failed (${result.status}): ${result.message}`);
    process.exit(1);
  }
  return result.data;
}
