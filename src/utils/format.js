const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

/** 1250 → "₹1,250" ; 12.5 → "₹12.5" */
export function formatPrice(amount) {
  return priceFormatter.format(Number(amount) || 0);
}

export function formatNumber(n) {
  return numberFormatter.format(Number(n) || 0);
}

const pad = (n) => String(n).padStart(2, '0');

/** ISO string → "26/10/2026" (DD/MM/YYYY) */
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** ISO string → "3:45 PM" */
export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${ampm}`;
}

export function formatDateTime(iso) {
  return iso ? `${formatDate(iso)}, ${formatTime(iso)}` : '';
}

/** "06:30" (24h) → "6:30 AM" */
export function formatClock(hhmm) {
  if (!hhmm) return '';
  const [hStr, m] = hhmm.split(':');
  let h = Number(hStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function isSameDay(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function isToday(iso) {
  return isSameDay(iso, Date.now());
}

/** Keeps only digits, max 10 — for Indian mobile numbers. */
export function cleanPhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

export function isValidPhone(value) {
  return /^[6-9]\d{9}$/.test(cleanPhone(value));
}

/** Joins class names, skipping falsy values. */
export function cx(...names) {
  return names.filter(Boolean).join(' ');
}

/** Minutes since an ISO time (never negative). */
export function minutesSince(iso) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

/** Days from today until an ISO date (negative = in the past). No date → Infinity (never ends). */
export function daysUntil(isoDate) {
  if (!isoDate) return Infinity;
  const end = new Date(isoDate);
  end.setHours(23, 59, 59, 999);
  return Math.ceil((end.getTime() - Date.now()) / 86400000) - 1;
}
