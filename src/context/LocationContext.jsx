import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { locate } from '../utils/geolocation.js';
import { isWithinServiceArea } from '../utils/geolocation.js';
import { PLACE_POINTS } from '../data/serviceArea.js';
import { readStorage, removeStorage, writeStorage } from '../utils/storage.js';

const KEY = 'zevio.location';
const LocationContext = createContext(null);

/**
 * Where the customer is right now — asked once after sign-in, and again only
 * when they open a location screen. Never watched in the background.
 *
 * status:
 *  'unknown'       nobody has asked yet → the app shows the explanation screen
 *  'in_range'      the phone is inside the delivery area
 *  'out_of_range'  the phone is outside it → they may still order for a friend inside
 *  'manual'        they picked their village themselves; treated as inside
 *  'unavailable'   permission refused, no GPS, or it timed out → behave as normal
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
  const check = useCallback(async () => {
    setChecking(true);
    try {
      const location = await locate();
      return save({
        status: location.inServiceArea ? 'in_range' : 'out_of_range',
        location,
        acknowledged: false,
      });
    } catch (e) {
      // Refused, unsupported or timed out: carry on without it, no nagging.
      save({ status: 'unavailable', location: null, acknowledged: true });
      throw e;
    } finally {
      setChecking(false);
    }
  }, [save]);

  /** "That's not right — let me pick my area." A chosen village is always in range. */
  const setManualPlace = useCallback((placeId) => {
    const point = PLACE_POINTS[placeId];
    return save({
      status: 'manual',
      location: { place: placeId, source: 'manual', lat: point?.lat ?? null, lng: point?.lng ?? null, inServiceArea: true },
      acknowledged: true,
    });
  }, [save]);

  /** Skip the question for now; the app behaves as it always did. */
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
    setManualPlace,
    skip,
    acknowledge,
    reset,
    /** The customer's own phone is outside the delivery area. */
    isOutOfRange: state.status === 'out_of_range',
    /** Does this delivery place sit inside the area? */
    placeInServiceArea: (placeId) => {
      const point = PLACE_POINTS[placeId];
      // A village in the admin's list is served even if it has no coordinates yet.
      return point ? isWithinServiceArea(point.lat, point.lng) : Boolean(placeId);
    },
  }), [state, checking, check, setManualPlace, skip, acknowledge, reset]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationStatus() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationStatus must be used inside LocationProvider');
  return ctx;
}
