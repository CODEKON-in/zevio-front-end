/** Error with a machine-readable code. The UI turns the code into a message (i18n `errors.*`). */
export class ServiceError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

/** A new UUID for records the app creates (the API only accepts UUID ids). */
export function newUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
