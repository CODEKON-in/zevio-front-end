/**
 * Where the app gets its data from.
 *   VITE_DATA_SOURCE=api  → the Zevio API (through the /api proxy, which adds the API key)
 *   anything else         → the built-in demo data (no server needed)
 *
 * Even in API mode, the parts the API does not have yet (delivery partners,
 * customer addresses, platform settings…) stay on demo data. See BACKEND-CHANGES.md.
 */
export const USE_API = import.meta.env.VITE_DATA_SOURCE === 'api';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** API records use UUIDs; demo records use short ids like "s1" or "o1012". */
export function isApiId(id) {
  return USE_API && typeof id === 'string' && UUID.test(id);
}

export function newUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
