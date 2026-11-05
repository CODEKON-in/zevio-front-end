/**
 * Where Zevio delivers — the only place these numbers live.
 *
 * The area is a circle: a centre point and a radius in kilometres. It is drawn
 * around the Papanasam ↔ Ayyampettai corridor and is deliberately generous,
 * because a customer wrongly told "we don't deliver to you" is a lost order,
 * while a customer wrongly let in is caught anyway by the village list in the
 * address form.
 *
 * Published coordinates for these villages disagree by a kilometre or two
 * (Wikipedia, latitude.to and indiamapia each give different points for
 * Ayyampettai), so CONFIRM THESE ON THE GROUND before launch: stand in each
 * village, open the app's address form, and check the detected village.
 * Adjusting the area later means editing this file only.
 */

/**
 * The villages Zevio serves, with a point near the centre of each.
 *
 * The key is the village's id, and it must match the id of the same village in
 * Admin → Settings exactly: that list is what the address form offers, and GPS
 * detection can only fill in a village that appears there. Settings has a
 * one-click "add the delivery villages" button that writes these names and
 * ids, so they cannot drift apart through a typing slip.
 */
export const PLACE_POINTS = Object.freeze({
  papanasam: { name: 'Papanasam', lat: 10.9333, lng: 79.2833 },          // Wikipedia
  rajagiri: { name: 'Rajagiri', lat: 10.9205, lng: 79.2450 },            // between Papanasam and Pasupathikoil — approximate
  pandaravadai: { name: 'Pandaravadai', lat: 10.91333, lng: 79.24194 },  // Wikipedia (the earlier value sat 2.6 km west)
  pasupathikoil: { name: 'Pasupathikoil', lat: 10.8876, lng: 79.1859 },  // Wikipedia
  ayyampettai: { name: 'Ayyampettai', lat: 10.8962, lng: 79.1943 },      // Wikipedia (the earlier value was 1.7 km off)
});

/**
 * The delivery area, worked out from the villages above rather than typed in
 * beside them.
 *
 * The two used to be written out separately, which let them drift apart: a
 * village could be near enough to be recognised by name and still fall
 * outside the circle, so the app could greet someone by their village and
 * refuse to deliver to it in the same breath. Deriving the area makes that
 * impossible — every village served is inside it by construction, and adding
 * one to the list above widens the area to cover it.
 */
function deriveServiceArea(points, bufferKm) {
  const list = Object.values(points);
  const lats = list.map((p) => p.lat);
  const lngs = list.map((p) => p.lng);
  const center = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
  // Rough km per degree at this latitude, used only to size the circle; the
  // real distance check is haversine.
  const KM_PER_DEG_LAT = 110.57;
  const KM_PER_DEG_LNG = 111.32 * Math.cos((center.lat * Math.PI) / 180);
  const furthest = Math.max(
    ...list.map((p) => Math.hypot((p.lat - center.lat) * KM_PER_DEG_LAT, (p.lng - center.lng) * KM_PER_DEG_LNG)),
  );
  return Object.freeze({
    center: Object.freeze(center),
    radiusKm: Math.round((furthest + bufferKm) * 10) / 10,
  });
}

/**
 * How far past the furthest village the area reaches. The hamlets and fields
 * around each village are served too, and a customer wrongly told "we don't
 * deliver to you" is a lost order. 2 km still leaves Thanjavur town (17 km)
 * and Kumbakonam (17 km) well outside, so the area cannot quietly swallow a
 * neighbouring town.
 */
export const SERVICE_AREA_BUFFER_KM = 2;

export const SERVICE_AREA = deriveServiceArea(PLACE_POINTS, SERVICE_AREA_BUFFER_KM);

/**
 * How vague a reading may be and still settle the question.
 *
 * A phone reports how sure it is, in metres. GPS outdoors is good to tens of
 * metres; a laptop, or a phone indoors with the radio off, falls back to wifi
 * and network lookup and can be wrong by kilometres — in a village it often
 * lands on the nearest town, or on the operator's gateway city. Telling
 * someone standing in Pandaravadai that they are outside the delivery area,
 * on the strength of a reading that vague, is simply wrong. Past this limit
 * the app says it could not be sure and asks, rather than deciding.
 */
export const ACCURACY_LIMIT_M = 2000;

/**
 * How close a GPS reading must be to a village before the app names it.
 * Beyond this the app says "couldn't detect your area" and asks the person to
 * pick from the list, rather than guessing wrong.
 */
export const PLACE_MATCH_KM = 3.5;
