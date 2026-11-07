import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { detectArea, getCurrentPosition } from '../utils/geolocation.js';
import { ServiceError } from '../utils/errors.js';
import { readStorage, removeStorage, writeStorage } from '../utils/storage.js';

const KEY = 'zevio.location';
const LocationContext = createContext(null);

const UNKNOWN = { status: 'unknown', location: null, acknowledged: false };

/**
 * Dev-only escape hatch for testing other screens: set
 * VITE_SKIP_LOCATION_STEP=true in .env.local while running `npm run dev`.
 * It does nothing in a production build — there is no skip for customers.
 */
export const DEV_SKIP_LOCATION = Boolean(import.meta.env?.DEV) && import.meta.env?.VITE_SKIP_LOCATION_STEP === 'true';

/**
 * Bring a saved value from an older version of the app into today's rules.
 *  - 'unavailable' came from the old "Continue without it" button, which no
 *    longer exists: the person is asked again.
 *  - an in-range reading used to go straight to Home without a Continue tap,
 *    so it counts as confirmed.
 *  - an out-of-range reading nobody confirmed is asked again, so the
 *    out-of-range screen is always seen before gifting mode starts.
 */
function load() {
  const saved = readStorage(KEY, null);
  if (!saved || !saved.status) return UNKNOWN;
  if (saved.status === 'in_range') return { ...saved, acknowledged: true };
  if (saved.status === 'out_of_range' && saved.acknowledged) return saved;
  return UNKNOWN;
}

/**
 * The customer's home area, and whether we deliver there.
 *
 * Set by the location step right after sign-up (and again whenever they
 * update it from Profile). Never watched in the background: the phone's
 * position is read only when they tap "Use my location".
 *
 * Uses detectArea(), the same rule as "Use my location" in the address form,
 * so the two can never disagree about who is in range.
 *
 * status:
 *  'unknown'       not established yet → the app shows the location step
 *  'in_range'      home area is one we serve → normal ordering (COD or UPI)
 *  'out_of_range'  outside every area we serve → gifting mode: they can order
 *                  for someone inside the area (UPI only, see Checkout)
 *
 * location (what is saved):
 *  { area, lat, lng, accuracy, detectionMethod: 'gps' | 'manual', inRange,
 *    nearestArea, distanceKm }
 *  plus `place` and `source`, the older names for area and detectionMethod,
 *  which other screens still read.
 */
export function LocationProvider({ children }) {
  const [state, setState] = useState(load);

  const save = useCallback((next) => {
    setState(next);
    writeStorage(KEY, next);
    return next;
  }, []);

  /**
   * Take a fresh GPS reading and work out the area. Saves nothing: the screen
   * shows the result and the person confirms it with Continue.
   * Resolves to a result; rejects with ServiceError (PERMISSION_DENIED,
   * POSITION_UNAVAILABLE, TIMEOUT, UNSUPPORTED, INSECURE_CONTEXT, TOO_VAGUE).
   */
  const detect = useCallback(async (onProgress) => {
    const reading = await getCurrentPosition({ onProgress });
    const result = detectArea(reading);
    // Too rough to say which village: not an answer, so it is a failure.
    if (result.status === 'LOW_ACCURACY') throw new ServiceError('TOO_VAGUE');
    const inRange = result.status === 'IN_AREA';
    return {
      status: inRange ? 'in_range' : 'out_of_range',
      area: inRange ? result.area : null,
      nearestArea: inRange ? null : result.nearestArea,
      distanceKm: result.distanceKm,
      location: {
        area: inRange ? result.area.id : null,
        lat: reading.lat,
        lng: reading.lng,
        accuracy: reading.accuracy,
        detectionMethod: 'gps',
        inRange,
        nearestArea: inRange ? null : result.nearestArea?.id || null,
        distanceKm: result.distanceKm,
        place: inRange ? result.area.id : null,
        source: 'gps',
      },
    };
  }, []);

  /** A result for an area picked by hand (only offered after GPS failed). */
  const manualResult = useCallback((area) => ({
    status: 'in_range',
    area,
    nearestArea: null,
    distanceKm: 0,
    location: {
      area: area.id,
      lat: area.lat,
      lng: area.lng,
      accuracy: null,
      detectionMethod: 'manual',
      inRange: true,
      nearestArea: null,
      distanceKm: 0,
      place: area.id,
      source: 'manual',
    },
  }), []);

  /** A result for "I'm not in your area — I'll order for someone else". */
  const elsewhereResult = useCallback(() => ({
    status: 'out_of_range',
    area: null,
    nearestArea: null,
    distanceKm: null,
    location: {
      area: null,
      lat: null,
      lng: null,
      accuracy: null,
      detectionMethod: 'manual',
      inRange: false,
      nearestArea: null,
      distanceKm: null,
      place: null,
      source: 'manual',
    },
  }), []);

  /** Continue: make a result the customer's home location. */
  const confirm = useCallback((result) => save({ status: result.status, location: result.location, acknowledged: true }), [save]);

  const reset = useCallback(() => {
    removeStorage(KEY);
    setState(UNKNOWN);
  }, []);

  const value = useMemo(() => ({
    ...state,
    detect,
    manualResult,
    elsewhereResult,
    confirm,
    reset,
    /** The location step is still needed before Home. */
    needsStep: !DEV_SKIP_LOCATION && (state.status === 'unknown' || !state.acknowledged),
    /**
     * Gifting mode: the customer's home area is outside the delivery area.
     * This is the one flag Checkout reads to make an order a gift order
     * (no COD, UPI only, not returnable, receiver's name and phone needed).
     */
    isOutOfRange: state.status === 'out_of_range',
    /**
     * Is a saved address one we deliver to? Every area an address can be
     * given is one we serve — it can only be picked from the served list — so
     * this asks whether an area was set at all.
     */
    placeInServiceArea: (placeId) => Boolean(placeId),
  }), [state, detect, manualResult, elsewhereResult, confirm, reset]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationStatus() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationStatus must be used inside LocationProvider');
  return ctx;
}
