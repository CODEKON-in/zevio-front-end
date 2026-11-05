/**
 * The phone's location, and whether it falls inside the delivery area.
 *
 * Nothing here tracks anyone: the location is read when the person asks for it
 * (or once at sign-in, after they agree), and is never watched in the background.
 */
import { ACCURACY_LIMIT_M, PLACE_MATCH_KM, PLACE_POINTS, SERVICE_AREA } from '../data/serviceArea.js';
import { ServiceError } from './errors.js';

/** Browser geolocation errors, as codes the UI can show a message for. */
const BROWSER_ERRORS = { 1: 'PERMISSION_DENIED', 2: 'POSITION_UNAVAILABLE', 3: 'TIMEOUT' };

/**
 * maximumAge is 0 on purpose. It used to be 60000, which lets the browser hand
 * back a position up to a minute old without consulting the GPS at all — so a
 * coarse wifi fix taken earlier was returned instantly, and the app decided
 * the delivery area from it. That is the difference between "roughly this
 * town" and "this street".
 *
 * timeout is 30s rather than 10s because a cheap Android that has not seen the
 * sky recently needs twenty seconds or more for its first satellite lock, and
 * the old limit gave up before that happened.
 */
const OPTIONS = { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 };

/** Good enough to place someone in a village rather than a district. */
export const ACCURACY_TARGET_M = 100;

/** How long to keep refining before taking the best reading so far. */
export const FIX_DEADLINE_MS = 25000;

/**
 * Where the phone is now.
 * @returns {Promise<{lat:number, lng:number, accuracy:number}>}
 * Rejects with ServiceError: PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT, UNSUPPORTED.
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new ServiceError('UNSUPPORTED'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      (error) => reject(new ServiceError(BROWSER_ERRORS[error?.code] || 'POSITION_UNAVAILABLE', error?.message)),
      { ...OPTIONS, ...options },
    );
  });
}

/**
 * The best position the phone can manage, rather than the first one it offers.
 *
 * A single getCurrentPosition takes whatever is available the instant it is
 * asked. On a phone that is usually the network fix — right town, wrong few
 * kilometres — because the GPS has not reported yet. Accuracy then improves
 * over the next several seconds as satellites come in, but nobody is
 * listening by then.
 *
 * So this watches instead, keeps the most accurate reading seen, and stops as
 * soon as one is good enough, or when the deadline passes and the best so far
 * is all there is. onProgress fires for each improvement so the screen can
 * show the fix tightening rather than appearing to hang.
 *
 * A refusal ends it immediately — waiting out the deadline would tell the
 * person nothing they are not already being told by the browser.
 */
export function getAccuratePosition({
  targetM = ACCURACY_TARGET_M,
  deadlineMs = FIX_DEADLINE_MS,
  onProgress,
  isGoodEnough,
} = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new ServiceError('UNSUPPORTED'));
      return;
    }

    let best = null;
    let watchId = null;
    let timer = null;
    let settled = false;

    const stop = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer !== null) clearTimeout(timer);
      watchId = null;
      timer = null;
    };
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      stop();
      fn(value);
    };

    timer = setTimeout(() => {
      // Out of time: the best reading so far beats nothing, and the caller
      // decides whether it is precise enough to act on.
      if (best) finish(resolve, best);
      else finish(reject, new ServiceError('TIMEOUT'));
    }, deadlineMs);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const reading = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        if (!best || !(best.accuracy <= reading.accuracy)) {
          best = reading;
          onProgress?.(reading);
        }
        // Stop as soon as the reading can answer the question being asked.
        // Chasing ±100 m when a ±6 km fix already puts someone unambiguously
        // inside the area just makes them wait for nothing.
        const enough = isGoodEnough
          ? isGoodEnough(best)
          : Number.isFinite(best.accuracy) && best.accuracy <= targetM;
        if (enough) finish(resolve, best);
      },
      (error) => {
        const code = BROWSER_ERRORS[error?.code] || 'POSITION_UNAVAILABLE';
        // A refusal or missing hardware is final. Anything else is worth
        // sitting out, because a later reading may still arrive.
        if (code === 'PERMISSION_DENIED' || code === 'UNSUPPORTED') {
          finish(reject, new ServiceError(code, error?.message));
        } else if (!best && code === 'TIMEOUT') {
          finish(reject, new ServiceError('TIMEOUT', error?.message));
        }
      },
      { ...OPTIONS, timeout: deadlineMs },
    );
  });
}

/**
 * 'phone' or 'computer', from what the browser says about itself.
 *
 * It matters because the two find themselves completely differently. A phone
 * has GPS. Almost no laptop or desktop does: it guesses from nearby wifi or,
 * failing that, from the internet provider — which in a village is routinely
 * a town tens of kilometres away. The advice for each is different, so the
 * app needs to know which it is talking to. A hint, not a guarantee.
 */
export function deviceKind() {
  if (typeof navigator === 'undefined') return 'phone';
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return 'phone';
  // iPadOS reports itself as a Mac, but a Mac has no touch screen.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'phone';
  return 'computer';
}

const R_EARTH_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Distance between two points in kilometres (haversine). */
export function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Is this point inside the delivery area? Ignores how sure the reading was. */
export function isWithinServiceArea(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) return false;
  return distanceKm(SERVICE_AREA.center, { lat, lng }) <= SERVICE_AREA.radiusKm;
}

/**
 * What a reading can actually support: 'in', 'out', or 'unsure'.
 *
 * A position is a circle, not a point — `accuracy` is its radius in metres
 * and the phone is somewhere inside it. The app used to read the centre and
 * ignore the rest, so a wifi fix placing someone twenty kilometres away, give
 * or take twenty kilometres, produced a flat "you are outside our delivery
 * area". That is how a customer standing in the middle of the corridor gets
 * turned away.
 *
 * So if anywhere in that circle could be inside the area, treat it as inside:
 * being too generous costs one delivery, being wrong costs the customer. Only
 * a reading precise enough to be trusted may say "out"; anything vaguer is
 * 'unsure', and the person is asked rather than told.
 */
export function serviceAreaVerdict(lat, lng, accuracyM) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) return 'unsure';
  const distance = distanceKm(SERVICE_AREA.center, { lat, lng });
  const uncertaintyKm = Number.isFinite(accuracyM) && accuracyM > 0 ? accuracyM / 1000 : 0;
  if (distance - uncertaintyKm <= SERVICE_AREA.radiusKm) return 'in';
  return Number.isFinite(accuracyM) && accuracyM > ACCURACY_LIMIT_M ? 'unsure' : 'out';
}

/**
 * Which village a point is in.
 *
 * This is the local stand-in for a maps service: it picks the nearest village
 * Zevio serves, and only if the point is close enough to be sure. Swapping in a
 * real geocoding API later means changing this one function — the rest of the
 * app only reads { place, lat, lng }.
 *
 * @returns {Promise<{place:string, lat:number, lng:number, distanceKm:number}|null>}
 */
export async function reverseGeocode(lat, lng) {
  let best = null;
  for (const [place, point] of Object.entries(PLACE_POINTS)) {
    const km = distanceKm(point, { lat, lng });
    if (!best || km < best.distanceKm) best = { place, lat, lng, distanceKm: km };
  }
  return best && best.distanceKm <= PLACE_MATCH_KM ? best : null;
}

/** Everything a screen needs after one reading: the point, its village, and whether we deliver there. */
export async function locate(options = {}) {
  const position = await getAccuratePosition({
    // The question is "do we deliver here", not "where exactly are you". A
    // reading that already answers it is good enough; one that cannot is
    // worth waiting on. So a fix that puts someone inside the area settles it
    // at once, however loose, and only an ambiguous one keeps refining.
    isGoodEnough: (reading) =>
      serviceAreaVerdict(reading.lat, reading.lng, reading.accuracy) === 'in' ||
      (Number.isFinite(reading.accuracy) && reading.accuracy <= ACCURACY_TARGET_M),
    ...options,
  });
  const verdict = serviceAreaVerdict(position.lat, position.lng, position.accuracy);
  // A reading too vague to place inside the area is also too vague to name a
  // village from: picking the nearest one would put a confident label on a
  // guess, which is how "you are in Pandaravadai, and we do not deliver to
  // Pandaravadai" happens.
  const match = verdict === 'unsure' ? null : await reverseGeocode(position.lat, position.lng);
  return {
    lat: position.lat,
    lng: position.lng,
    accuracy: position.accuracy,
    verdict,
    distanceKm: distanceKm(SERVICE_AREA.center, { lat: position.lat, lng: position.lng }),
    place: match?.place || null,
    inServiceArea: verdict === 'in',
    source: 'gps',
  };
}
