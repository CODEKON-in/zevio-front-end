import { ORDER_STATUS, PAYMENT_METHODS } from './constants.js';

/** ISO time when the order reached a status (from statusHistory), or null. */
export function statusTime(order, status) {
  const h = order.statusHistory?.find((x) => x.status === status);
  return h ? h.at : null;
}

export function deliveredAt(order) {
  return statusTime(order, ORDER_STATUS.DELIVERED);
}

/** Cash the delivery partner must collect for this order (0 if paid online). */
export function cashToCollect(order) {
  return order.paymentMethod === PAYMENT_METHODS.COD ? order.total : 0;
}

/** "2026-10-26" style key in local time, for grouping by day. */
export function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
