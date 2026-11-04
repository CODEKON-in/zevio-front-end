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

/** A description is a short, plain sentence or two — not an essay, not markup. */
export const DESCRIPTION_MAX = 200;

/**
 * Reads the minimum-order field the way it is likely to be typed: blank means
 * "no minimum" (1), a decimal is rounded, and anything that is not a number at
 * all is rejected rather than quietly becoming 1 — silently saving 1 when
 * someone meant 10 is the mistake nobody notices until an order arrives.
 */
export function readMinQty(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return 1;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  const whole = Math.round(n);
  return whole >= 1 ? whole : null;
}
