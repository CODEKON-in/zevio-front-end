/**
 * Where Zevio delivers — the only place these numbers live.
 *
 * Each area is a village or town with a centre point and a radius: roughly how
 * far its houses spread from the centre. A customer is "in range" when they are
 * within the radius of at least one area, and their area is the one whose centre
 * is closest. Both the sign-in check and "Use my location" use exactly this.
 *
 * The id must match the same village's id in Admin → Settings. The customer's
 * area dropdown comes from this list, but shops are assigned to the villages in
 * Settings, and Settings has a one-click button that copies these in so the two
 * cannot drift apart through a typing slip.
 *
 * TODO(owner): confirm each centre on the ground and set each radius. To check a
 * centre: Google Maps → long-press the middle of the village → copy the numbers.
 * The current centres are Wikipedia's except Rajagiri, which is an estimate.
 * The radii are the spec's starting values (2.5 km for the two towns, 1.5 km for
 * villages). With them, a short stretch of road between some villages is in no
 * area's radius — see the gap note at the bottom of this file.
 *
 * To add a village: add a line with its id, name, lat, lng and radiusKm. Leave
 * lat/lng as 0 until you have real values — the app then ignores that area and
 * warns in the console during development, rather than placing it in the sea.
 */
export const SERVICE_AREAS = Object.freeze([
  Object.freeze({ id: 'papanasam', name: 'Papanasam', lat: 10.9333, lng: 79.2833, radiusKm: 2.5 }),       // Wikipedia
  Object.freeze({ id: 'rajagiri', name: 'Rajagiri', lat: 10.9205, lng: 79.245, radiusKm: 1.5 }),           // ESTIMATE — confirm on the ground
  Object.freeze({ id: 'pandaravadai', name: 'Pandaravadai', lat: 10.91333, lng: 79.24194, radiusKm: 1.5 }), // Wikipedia
  Object.freeze({ id: 'pasupathikoil', name: 'Pasupathikoil', lat: 10.8876, lng: 79.1859, radiusKm: 1.5 }), // Wikipedia
  Object.freeze({ id: 'ayyampettai', name: 'Ayyampettai', lat: 10.8962, lng: 79.1943, radiusKm: 2.5 }),     // Wikipedia
]);

/** An area with no real coordinates yet (still 0, 0). */
export const isPlaceholder = (area) => !area.lat || !area.lng;

/** Areas the app can actually locate people in. */
export const LOCATABLE_AREAS = SERVICE_AREAS.filter((a) => !isPlaceholder(a));

/** Look an area up by id. */
export const areaById = (id) => SERVICE_AREAS.find((a) => a.id === id) || null;

/**
 * A GPS fix less precise than this cannot be trusted to say which village
 * someone is in — villages here sit 1–5 km apart — so the app says so rather
 * than guessing.
 */
export const LOW_ACCURACY_M = 1000;

if (import.meta.env?.DEV) {
  const missing = SERVICE_AREAS.filter(isPlaceholder).map((a) => a.name);
  if (missing.length) {
    console.warn(
      `[Zevio] serviceAreas.js: ${missing.join(', ')} still ${missing.length === 1 ? 'has' : 'have'} lat/lng 0. ` +
        'Location cannot detect these areas until real coordinates are filled in.',
    );
  }
}

/*
 * Gap note, with the radii above (centre-to-centre distance minus both radii):
 *   Papanasam ↔ Rajagiri         4.4 km apart → about 0.4 km of road in no area
 *   Pandaravadai ↔ Ayyampettai   5.5 km apart → about 1.5 km of road in no area
 * Someone living there is told they are out of range. Either widen the radii of
 * the villages either side, or add the hamlets in between as areas of their own.
 */
