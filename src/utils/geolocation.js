/**
 * The phone's location, and whether it falls inside the delivery area.
 *
 * Nothing here tracks anyone: the location is read when the person asks for it
 * (or once at sign-in, after they agree), and is never watched in the background.
 */
import { PLACE_MATCH_KM, PLACE_POINTS, SERVICE_AREA } from '../data/serviceArea.js';
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

/** Is this point inside the delivery area? */
export function isWithinServiceArea(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) return false;
  return distanceKm(SERVICE_AREA.center, { lat, lng }) <= SERVICE_AREA.radiusKm;
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
  const match = await reverseGeocode(position.lat, position.lng);
  return {
    lat: position.lat,
    lng: position.lng,
    accuracy: position.accuracy,
    place: match?.place || null,
    inServiceArea: isWithinServiceArea(position.lat, position.lng),
    source: 'gps',
  };
}
