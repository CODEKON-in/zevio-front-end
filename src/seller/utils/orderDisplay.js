/**
 * How an order reads on screen.
 *
 * The seller reads these out on the phone and writes them on the parcel, so
 * they have to match what the customer sees, exactly. Nothing here shortens,
 * re-cases or invents a value.
 */

/**
 * The order number the customer was given. Firestore's document id is only a
 * fallback, and it is never cut down: half an id is worse than a long one.
 */
export function orderNumber(order) {
  const n = order?.orderNumber || order?.orderId || order?.id || '';
  return String(n).trim();
}

/** "Cash on Delivery" / "UPI", not "cod". */
export function paymentLabel(method) {
  const m = String(method || '').toLowerCase();
  if (m === 'cod' || m === 'cash' || m === 'cash_on_delivery') return 'Cash on Delivery';
  if (m === 'upi' || m === 'online' || m === 'prepaid') return 'UPI';
  return method ? String(method) : 'Cash on Delivery';
}

/** Has the shop already been paid, or does the rider collect the money? */
export function paymentState(order) {
  const paid = String(order?.paymentStatus || '').toLowerCase() === 'paid';
  const method = String(order?.paymentMethod || '').toLowerCase();
  if (paid || method === 'upi' || method === 'online' || method === 'prepaid') {
    return { label: 'Paid online', paid: true };
  }
  return { label: 'Collect on delivery', paid: false };
}

/**
 * The delivery address as one readable block: door and street first, because
 * that is what the rider needs, then the area, then the landmark.
 */
export function addressLines(order) {
  const a = order?.address || {};
  const street = [a.doorNumber || a.door, a.streetName || a.street].filter(Boolean).join(', ');
  const area = order?.deliveryArea || a.area || '';
  const landmark = order?.landmark || a.landmark || '';
  return { street, area, landmark };
}

/** Anything the customer typed for the kitchen or the rider. */
export function orderNote(order) {
  return order?.notes || order?.instructions || order?.address?.notes || '';
}
