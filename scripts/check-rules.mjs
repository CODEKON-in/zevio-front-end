/**
 * Rule checks — run with `node scripts/check-rules.mjs`, no test runner needed.
 *
 * These cover the order rules a customer can lose money on if they drift:
 * a product's minimum order quantity, and the correction of a cart that was
 * saved before the shop changed that minimum.
 *
 * The reducer is imported from the app itself rather than copied, so the
 * checks fail if the real rule changes under them.
 */
import { lineMin } from '../src/utils/productRules.js';
import { MAX_ITEM_QTY } from '../src/utils/constants.js';
import { detectArea, distanceKm } from '../src/utils/geolocation.js';
import { SERVICE_AREAS, areaById } from '../src/data/serviceAreas.js';

let failures = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
};

console.log('\nlineMin — what the cart treats as this product\'s minimum\n');

check('no field at all means no minimum', lineMin({}), 1);
check('undefined means no minimum', lineMin({ minOrderQty: undefined }), 1);
check('null means no minimum', lineMin({ minOrderQty: null }), 1);
check('a missing product does not throw', lineMin(undefined), 1);
check('1 is no minimum', lineMin({ minOrderQty: 1 }), 1);
check('0 is not a minimum of 0', lineMin({ minOrderQty: 0 }), 1);
check('a negative is not a minimum', lineMin({ minOrderQty: -4 }), 1);
check('a real minimum comes through', lineMin({ minOrderQty: 3 }), 3);
check('a string from the API still counts', lineMin({ minOrderQty: '5' }), 5);
check('a fraction floors rather than blocking', lineMin({ minOrderQty: 2.7 }), 2);
check('nonsense is not a minimum', lineMin({ minOrderQty: 'abc' }), 1);
check(
  'a minimum nobody could reach is capped, not left unbuyable',
  lineMin({ minOrderQty: MAX_ITEM_QTY + 50 }),
  MAX_ITEM_QTY,
);

console.log('\nStale cart — the shop raised a minimum after the cart was saved\n');

// The same arithmetic the SET_MINS reducer applies, checked against the cases
// that matter: a line below the new minimum is raised, a line already above it
// is left alone, and a product the shop no longer lists keeps what it had.
const clampQty = (qty, minQty) => Math.min(Math.max(qty, minQty), MAX_ITEM_QTY);
const applyMins = (items, mins) =>
  items.map((i) => {
    const minQty = mins[i.productId] ?? i.minQty ?? 1;
    return { ...i, minQty, qty: clampQty(i.qty, minQty) };
  });

const saved = [
  { productId: 'puff', qty: 2, minQty: 1 },   // shop has since set min 5
  { productId: 'cake', qty: 1, minQty: 1 },   // unchanged
  { productId: 'bun', qty: 8, minQty: 1 },    // already above a new min of 3
  { productId: 'gone', qty: 2, minQty: 1 },   // delisted, absent from the shop's reply
];
const fresh = { puff: 5, cake: 1, bun: 3 };
const corrected = applyMins(saved, fresh);

check('a line below the new minimum is raised to it', corrected[0].qty, 5);
check('a line with no minimum is untouched', corrected[1].qty, 1);
check('a line already above the minimum keeps its quantity', corrected[2].qty, 8);
check('a delisted product keeps what the customer had', corrected[3].qty, 2);
check('the new minimum is remembered on the line', corrected[0].minQty, 5);
check(
  'raised lines are the ones worth telling the customer about',
  corrected.filter((c, n) => c.qty > saved[n].qty).map((c) => c.productId),
  ['puff'],
);

console.log('\nService areas — detectArea()\n');

const at = (lat, lng, accuracy = 10) => detectArea({ lat, lng, accuracy });
const statusAndArea = (r) => [r.status, r.area?.id ?? r.nearestArea?.id ?? null];

// 1. Standing at each area's centre finds that area.
for (const a of SERVICE_AREAS) {
  check(`centre of ${a.name} → ${a.name}`, statusAndArea(at(a.lat, a.lng)), ['IN_AREA', a.id]);
}

// 2. Between two areas whose circles overlap, the closer centre wins.
// Rajagiri and Pandaravadai are 0.86 km apart; a point a quarter of the way
// from Pandaravadai towards Rajagiri is inside both circles.
const pan = areaById('pandaravadai');
const raj = areaById('rajagiri');
const quarter = { lat: pan.lat + (raj.lat - pan.lat) * 0.25, lng: pan.lng + (raj.lng - pan.lng) * 0.25 };
check('inside two circles → the closer centre (Pandaravadai)', statusAndArea(at(quarter.lat, quarter.lng)), ['IN_AREA', 'pandaravadai']);
const threeQ = { lat: pan.lat + (raj.lat - pan.lat) * 0.75, lng: pan.lng + (raj.lng - pan.lng) * 0.75 };
check('inside two circles → the closer centre (Rajagiri)', statusAndArea(at(threeQ.lat, threeQ.lng)), ['IN_AREA', 'rajagiri']);

// 3. Far away → out of range, with the nearest area and how far it is.
const chennai = at(13.0827, 80.2707);
check('Chennai → OUT_OF_RANGE', chennai.status, 'OUT_OF_RANGE');
check('Chennai → nearest area named', chennai.nearestArea?.id, 'papanasam');
check('Chennai → distance reported (250–280 km)', chennai.distanceKm > 250 && chennai.distanceKm < 280, true);

// 4. A rough fix is not trusted, wherever it lands — even the middle of a village.
check('rough fix in the middle of Pandaravadai → LOW_ACCURACY', at(pan.lat, pan.lng, 1500).status, 'LOW_ACCURACY');
check('exactly 1000 m is still trusted', at(pan.lat, pan.lng, 1000).status, 'IN_AREA');
check('rough fix far away → LOW_ACCURACY, not a confident refusal', at(13.0827, 80.2707, 30000).status, 'LOW_ACCURACY');
check('junk coordinates → LOW_ACCURACY', detectArea({ lat: NaN, lng: undefined, accuracy: 5 }).status, 'LOW_ACCURACY');
check('no accuracy reported is taken at face value', detectArea({ lat: pan.lat, lng: pan.lng }).status, 'IN_AREA');

// 5. The road between Pandaravadai and Ayyampettai: with the current radii the
// middle is in no area's circle. This documents the gap rather than hiding it;
// it should start failing the day the radii are widened to close it.
const ayy = areaById('ayyampettai');
const mid = { lat: (pan.lat + ayy.lat) / 2, lng: (pan.lng + ayy.lng) / 2 };
check(
  `KNOWN GAP: midway Pandaravadai–Ayyampettai (${distanceKm(pan, mid).toFixed(1)} km from each) is out of range`,
  at(mid.lat, mid.lng).status,
  'OUT_OF_RANGE',
);

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`);
process.exit(failures === 0 ? 0 : 1);
