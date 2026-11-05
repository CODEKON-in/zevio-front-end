/**
 * The phone's location, and which of our areas it falls in.
 *
 * Nothing here tracks anyone: the location is read when the person taps a
 * button (or once at sign-in, after they agree) and is never watched in the
 * background.
 *
 * Testing without travelling: Chrome DevTools → ⋮ → More tools → Sensors →
 * Location → "Other…" and type a latitude and longitude, then tap the button.
 * Pick a point from src/data/serviceAreas.js to land in an area, or Chennai
 * (13.0827, 80.2707) to be out of range. DevTools reports an accuracy of a few
 * metres, so it will never trigger the low-accuracy path; that one is covered
 * by scripts/check-rules.mjs instead.
 */
import { LOCATABLE_AREAS, LOW_ACCURACY_M } from '../data/serviceAreas.js';
import { ServiceError } from './errors.js';

/** Browser geolocation errors, as codes the UI can show a message for. */
const BROWSER_ERRORS = { 1: 'PERMISSION_DENIED', 2: 'POSITION_UNAVAILABLE', 3: 'TIMEOUT' };

/** How long a tap may wait for a fix. */
export const FIX_TIMEOUT_MS = 15000;

/** Stop waiting once a reading is this good: it settles which village, with room to spare. */
export const ACCURACY_TARGET_M = 100;

/**
 * Where the phone is now, as { lat, lng, accuracy } — accuracy in metres.
 *
 * Every tap takes a fresh fix (maximumAge 0): an older cached position is
 * often a rough network guess from earlier and would be returned instantly
 * without the GPS being consulted.
 *
 * It listens rather than asking once. A single getCurrentPosition returns the
 * first fix the phone has — usually the rough network one, kilometres out —
 * and the GPS fix that arrives a few seconds later is thrown away. Listening
 * for up to FIX_TIMEOUT_MS and keeping the best reading is what makes the
 * village come out right. It stops early once a reading is within
 * ACCURACY_TARGET_M, which outdoors is usually within a few seconds.
 *
 * onProgress(reading) fires each time the fix improves, so a screen can show
 * that something is happening.
 *
 * Rejects with ServiceError: UNSUPPORTED, INSECURE_CONTEXT, PERMISSION_DENIED,
 * POSITION_UNAVAILABLE or TIMEOUT.
 */
export function getCurrentPosition({ onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new ServiceError('UNSUPPORTED'));
      return;
    }
    // Browsers refuse location on plain http (other than localhost) and say
    // only "permission denied", which sends people hunting through settings
    // for a permission that was never the problem.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      reject(new ServiceError('INSECURE_CONTEXT'));
      return;
    }

    let best = null;
    let watchId = null;
    let timer = null;
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer !== null) clearTimeout(timer);
      fn(value);
    };

    timer = setTimeout(() => {
      if (best) finish(resolve, best);
      else finish(reject, new ServiceError('TIMEOUT'));
    }, FIX_TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const reading = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        if (!best || reading.accuracy < best.accuracy) {
          best = reading;
          onProgress?.(reading);
        }
        if (best.accuracy <= ACCURACY_TARGET_M) finish(resolve, best);
      },
      (error) => {
        const code = BROWSER_ERRORS[error?.code] || 'POSITION_UNAVAILABLE';
        // A refusal is final. Anything else may still be followed by a reading
        // before the deadline, so only give up early if there is nothing to show.
        if (code === 'PERMISSION_DENIED') finish(reject, new ServiceError(code, error?.message));
        else if (!best && code === 'TIMEOUT') finish(reject, new ServiceError(code, error?.message));
      },
      { enableHighAccuracy: true, timeout: FIX_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}

const R_EARTH_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Distance between two points in kilometres (haversine). */
export function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** Every locatable area with its distance from a point, closest first. */
export function areasByDistance({ lat, lng }) {
  if (!isNumber(lat) || !isNumber(lng)) return [];
  return LOCATABLE_AREAS.map((area) => ({ area, distanceKm: distanceKm(area, { lat, lng }) })).sort(
    (x, y) => x.distanceKm - y.distanceKm,
  );
}

/**
 * Which of our areas a reading falls in. Returns exactly one of:
 *   { status: 'IN_AREA', area, distanceKm }
 *   { status: 'OUT_OF_RANGE', nearestArea, distanceKm }
 *   { status: 'LOW_ACCURACY', accuracy }
 *
 * IN_AREA is the closest area whose radius contains the point — when two
 * overlap, the nearer centre wins. A fix rougher than LOW_ACCURACY_M is not
 * trusted at all, because villages here are only 1–5 km apart: it could put
 * someone in the wrong one, or out of range while they stand in the middle of
 * one. Coordinates that are not numbers are treated the same way.
 */
export function detectArea({ lat, lng, accuracy } = {}) {
  if (!isNumber(lat) || !isNumber(lng)) return { status: 'LOW_ACCURACY', accuracy: null };
  if (isNumber(accuracy) && accuracy > LOW_ACCURACY_M) return { status: 'LOW_ACCURACY', accuracy };

  const ranked = areasByDistance({ lat, lng });
  if (!ranked.length) return { status: 'OUT_OF_RANGE', nearestArea: null, distanceKm: Infinity };

  const inside = ranked.find(({ area, distanceKm: km }) => km <= area.radiusKm);
  if (inside) return { status: 'IN_AREA', area: inside.area, distanceKm: inside.distanceKm };

  return { status: 'OUT_OF_RANGE', nearestArea: ranked[0].area, distanceKm: ranked[0].distanceKm };
}

/**
 * 'phone' or 'computer', from what the browser says about itself.
 *
 * It matters because the two find themselves completely differently. A phone
 * has GPS; almost no laptop or desktop does, and guesses from wifi or the
 * internet provider — in a village, routinely a town tens of kilometres away.
 * A hint, not a guarantee.
 */
export function deviceKind() {
  if (typeof navigator === 'undefined') return 'phone';
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return 'phone';
  // iPadOS reports itself as a Mac, but a Mac has no touch screen.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'phone';
  return 'computer';
}
