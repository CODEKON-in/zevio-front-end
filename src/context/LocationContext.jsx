import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { detectArea, getCurrentPosition } from '../utils/geolocation.js';
import { ServiceError } from '../utils/errors.js';
import { readStorage, removeStorage, writeStorage } from '../utils/storage.js';

const KEY = 'zevio.location';
const LocationContext = createContext(null);

/**
 * Where the customer is right now — asked once after sign-in, and again only
 * when they open a location screen. Never watched in the background.
 *
 * Uses detectArea(), the same rule as "Use my location" in the address form,
 * so the sign-in check and the address form can never disagree about whether
 * someone is in range.
 *
 * status:
 *  'unknown'       nobody has asked yet → the app shows the explanation screen
 *  'in_range'      the phone is inside one of our areas
 *  'out_of_range'  the phone is outside all of them → they may still order for someone inside
 *  'unavailable'   refused, no GPS, or too rough to use, and they chose to
 *                  carry on without one → the app behaves as it always did
 */
export function LocationProvider({ children }) {
  const [state, setState] = useState(() => readStorage(KEY, null) || { status: 'unknown', location: null, acknowledged: false });
  const [checking, setChecking] = useState(false);

  const save = useCallback((next) => {
    setState(next);
    writeStorage(KEY, next);
    return next;
  }, []);

  /** Read the phone's location once and decide whether we deliver there. */
  const check = useCallback(async (onProgress) => {
    setChecking(true);
    try {
      const reading = await getCurrentPosition({ onProgress });
      const result = detectArea(reading);
      // Too rough to trust is not an answer. Throwing puts the gate into the
      // same state a refusal does: it explains and offers to try again,
      // rather than asserting something the reading cannot support.
      if (result.status === 'LOW_ACCURACY') {
        setState((s) => ({ ...s, lastError: 'TOO_VAGUE', lastReading: reading }));
        throw new ServiceError('TOO_VAGUE');
      }
      const location = {
        ...reading,
        source: 'gps',
        place: result.status === 'IN_AREA' ? result.area.id : null,
        nearestArea: result.status === 'OUT_OF_RANGE' ? result.nearestArea?.id || null : null,
        distanceKm: result.distanceKm,
      };
      return save({
        status: result.status === 'IN_AREA' ? 'in_range' : 'out_of_range',
        location,
        acknowledged: false,
      });
    } catch (e) {
      // A failed reading is not an answer either: the status stays 'unknown'
      // so the gate remains and says what happened. Only skip() ends it.
      setState((s) => ({ ...s, lastError: e.code || 'POSITION_UNAVAILABLE' }));
      throw e;
    } finally {
      setChecking(false);
    }
  }, [save]);

  /** Carry on without a location; the app behaves as it always did. */
  const skip = useCallback(() => save({ status: 'unavailable', location: null, acknowledged: true }), [save]);

  /** They have read the out-of-range screen and want to carry on. */
  const acknowledge = useCallback(() => save({ ...state, acknowledged: true }), [save, state]);

  const reset = useCallback(() => {
    removeStorage(KEY);
    setState({ status: 'unknown', location: null, acknowledged: false });
  }, []);

  const value = useMemo(() => ({
    ...state,
    checking,
    check,
    skip,
    acknowledge,
    reset,
    /** The customer's own phone is outside the delivery area. */
    isOutOfRange: state.status === 'out_of_range',
    /**
     * Is a saved address one we deliver to? Every area an address can be
     * given is one we serve — it can only be picked from the served list — so
     * this asks whether an area was set at all.
     */
    placeInServiceArea: (placeId) => Boolean(placeId),
  }), [state, checking, check, skip, acknowledge, reset]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationStatus() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationStatus must be used inside LocationProvider');
  return ctx;
}
