import { MAX_ITEM_QTY } from './constants.js';

/**
 * A product's minimum order quantity, as the cart can actually honour it.
 *
 * 1 means "no minimum", which is what every product without the field reads
 * as — so nothing breaks for shops that never touch the setting. The ceiling
 * is the same per-item ceiling the stepper uses, since a minimum nobody could
 * ever reach would leave the item unbuyable.
 */
export function lineMin(product) {
  const n = Math.floor(Number(product?.minOrderQty));
  if (!Number.isFinite(n) || n <= 1) return 1;
  return Math.min(n, MAX_ITEM_QTY);
}
