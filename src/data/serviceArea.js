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

/** The villages Zevio serves, with a point near the centre of each. */
export const PLACE_POINTS = Object.freeze({
  papanasam: { lat: 10.9333, lng: 79.2833 },      // Wikipedia
  rajagiri: { lat: 10.9205, lng: 79.2450 },       // between Papanasam and Pasupathikoil — approximate
  pandaravadai: { lat: 10.9120, lng: 79.2180 },   // approximate
  pasupathikoil: { lat: 10.8876, lng: 79.1859 },  // Wikipedia
  ayyampettai: { lat: 10.9014, lng: 79.1798 },    // latitude.to
});

/** Centre of the corridor (midway between Papanasam and Ayyampettai). */
export const SERVICE_AREA = Object.freeze({
  center: { lat: 10.9174, lng: 79.2316 },
  /**
   * 8 km covers every village above (the furthest sits about 6 km from the
   * centre) plus room for ordinary GPS error on a cheap phone.
   */
  radiusKm: 8,
});

/**
 * How close a GPS reading must be to a village before the app names it.
 * Beyond this the app says "couldn't detect your area" and asks the person to
 * pick from the list, rather than guessing wrong.
 */
export const PLACE_MATCH_KM = 3.5;
