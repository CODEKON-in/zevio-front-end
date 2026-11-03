import { useCallback, useRef } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getProductsByShop } from '../services/productService.js';
import { lineMin } from '../utils/productRules.js';
import { t } from '../i18n/index.js';

/**
 * Keeps a cart honest about each shop's minimum order quantity.
 *
 * A cart can sit in this browser for days, and a shop can raise a minimum in
 * the meantime. The floor is therefore checked against what the shop says now
 * at both points where it matters — when the cart is opened, and again in the
 * moment before the order is placed — because paying by UPI means leaving the
 * app and coming back minutes later, and a refresh can drop someone straight
 * onto checkout without passing the cart at all.
 *
 * Nothing changes quietly: every item that gets raised is named once, and the
 * caller is told so it can hold the order back until the new total has been seen.
 *
 * @returns {{ revalidate: () => Promise<Array> }} revalidate resolves with the
 *   lines that had to be raised — empty means the cart was already fine.
 */
export function useCartMinimums() {
  const cart = useCart();
  const { showToast } = useToast();
  // One mention per item, however many times the check runs.
  const toldAbout = useRef(new Set());

  const revalidate = useCallback(async () => {
    const { shopId, items } = cart.cart;
    if (!shopId || !items.length) return [];

    let fresh;
    try {
      fresh = await getProductsByShop(shopId);
    } catch {
      return []; // Offline is not a reason to block the order.
    }

    const mins = {};
    fresh.forEach((product) => {
      mins[product.id] = lineMin(product);
    });

    const raised = items.filter((item) => mins[item.productId] > item.qty);
    // Keep the stored floors in step even when nothing needs raising, so the
    // steppers disable − at the right number.
    cart.applyMinimums(mins);
    if (!raised.length) return [];

    const unsaid = raised.filter((item) => !toldAbout.current.has(item.productId));
    unsaid.forEach((item) => toldAbout.current.add(item.productId));
    if (unsaid.length === 1) {
      showToast(t('cart.minCorrected', { name: unsaid[0].name, count: mins[unsaid[0].productId] }), { type: 'info' });
    } else if (unsaid.length > 1) {
      showToast(t('cart.minCorrectedMany'), { type: 'info' });
    }
    return raised;
  }, [cart, showToast]);

  return { revalidate };
}
