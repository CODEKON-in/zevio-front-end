/**
 * When an order may still be cancelled — the one place this rule lives.
 *
 * A customer can cancel until the delivery partner picks the order up. Once it
 * is out for delivery, somebody is on the road with the food, so cancelling is
 * refused. Every screen with a Cancel button asks canCancelOrder(order); no
 * screen checks statuses itself.
 */
import { ORDER_STATUS } from './constants.js';

export const CANCELLABLE_STATUSES = Object.freeze([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
]);

/** @param {{status?: string}} order */
export function canCancelOrder(order) {
  return Boolean(order) && CANCELLABLE_STATUSES.includes(order.status);
}

/**
 * True once the order has left the shop — the moment the customer's Cancel
 * button turns into "can no longer be cancelled" (the shop panel says the same).
 */
export function isTooLateToCancel(order) {
  return Boolean(order) && [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(order.status);
}
