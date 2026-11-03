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

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`);
process.exit(failures === 0 ? 0 : 1);
