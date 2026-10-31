/**
 * Where the app gets its data from.
 *   VITE_DATA_SOURCE=mock → the built-in demo data (no server needed)
 *   anything else         → the Zevio API, through the /api proxy that adds the key
 *
 * The real API is the DEFAULT. It used to be the other way round, which meant a
 * host where the build-time variable was never set — as production was — quietly
 * served invented shops, orders and customers. Demo data is now opt-in.
 */
export const USE_API = import.meta.env.VITE_DATA_SOURCE !== 'mock';

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
