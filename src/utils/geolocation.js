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

const OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 };

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
export async function locate(options) {
  const position = await getCurrentPosition(options);
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
