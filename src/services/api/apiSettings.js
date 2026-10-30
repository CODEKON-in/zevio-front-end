/**
 * Platform settings and the service area, from the Zevio API.
 *
 * Both used to live in the browser, so every device had its own delivery fee and
 * its own list of places. They are rows in the database now: GET/POST /api/settings/
 * and /api/places/.
 */
import { apiGet, apiPost } from './client.js';
import { DEFAULT_SETTINGS } from '../../utils/constants.js';

/* The places list is read on nearly every screen (every city ↔ place lookup),
 * so it is cached briefly rather than fetched per record. */
const PLACES_TTL = 30000;
const SETTINGS_TTL = 30000;
let placesCache = { at: 0, list: null, pending: null };
let settingsCache = { at: 0, raw: null };

export function forgetPlaces() {
  placesCache = { at: 0, list: null, pending: null };
  settingsCache = { at: 0, raw: null };
}

/** The settings row as the API stores it. Used where only one value is needed
 *  (the delivery fee when placing an order), so it does not refetch the places. */
export async function fetchRawSettings(fresh = false) {
  if (!fresh && settingsCache.raw && Date.now() - settingsCache.at < SETTINGS_TTL) return settingsCache.raw;
  const raw = await apiGet('/settings/');
  settingsCache = { at: Date.now(), raw };
  return raw;
}

/** [{ id, name }] — the places the platform serves. */
export async function fetchPlaces(fresh = false) {
  if (!fresh && placesCache.list && Date.now() - placesCache.at < PLACES_TTL) return placesCache.list;
  if (!fresh && placesCache.pending) return placesCache.pending;
  const pending = apiGet('/places/').then((rows) => {
    const list = (rows || []).map((p) => ({ id: p.id, name: p.name }));
    placesCache = { at: Date.now(), list, pending: null };
    return list;
  });
  placesCache.pending = pending;
  try {
    return await pending;
  } finally {
    placesCache.pending = null;
  }
}

function toSettings(raw, places) {
  return {
    deliveryFee: Number(raw?.delivery_fee) || 0,
    partnerIncentive: Number(raw?.partner_incentive) || 0,
    servicePlaces: places,
    supportPhone: raw?.support_phone || '',
    supportWhatsApp: raw?.support_whatsapp || '',
    platformUpiId: raw?.platform_upi_id || '',
    platformUpiName: raw?.platform_upi_name || '',
  };
}

export async function getSettings() {
  const [raw, places] = await Promise.all([fetchRawSettings(true), fetchPlaces(true)]);
  return toSettings(raw, places);
}

const FIELD_COLUMN = {
  deliveryFee: 'delivery_fee',
  partnerIncentive: 'partner_incentive',
  supportPhone: 'support_phone',
  supportWhatsApp: 'support_whatsapp',
  platformUpiId: 'platform_upi_id',
  platformUpiName: 'platform_upi_name',
};

/**
 * Save a partial update. `servicePlaces` is compared with what the API has and
 * turned into add / rename / delete calls.
 */
export async function updateSettings(patch) {
  const fields = {};
  for (const [field, column] of Object.entries(FIELD_COLUMN)) {
    if (patch[field] !== undefined) fields[column] = patch[field];
  }
  if (Object.keys(fields).length) {
    await apiPost('/settings/', fields);
    settingsCache = { at: 0, raw: null };
  }

  if (Array.isArray(patch.servicePlaces)) {
    const current = await fetchPlaces(true);
    const byId = Object.fromEntries(current.map((p) => [p.id, p]));
    const wanted = patch.servicePlaces;

    for (const place of wanted) {
      if (!byId[place.id]) await apiPost('/place/add/', { id: place.id, name: place.name });
      else if (byId[place.id].name !== place.name) await apiPost('/place/update/', { id: place.id, name: place.name });
    }
    // Removing a place the shops still sit in answers 409 — let that surface.
    for (const place of current) {
      if (!wanted.some((p) => p.id === place.id)) await apiPost('/place/delete/', { id: place.id });
    }
    forgetPlaces();
  }

  return getSettings();
}

/** Used when a screen only needs the places and the rest of settings is already loaded. */
export async function getPlacesOrEmpty() {
  try {
    return await fetchPlaces();
  } catch {
    return DEFAULT_SETTINGS.servicePlaces;
  }
}
