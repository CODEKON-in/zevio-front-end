/** App-wide constants. Never hardcode these values in components. */

/**
 * Order statuses — exactly the lifecycle in the Zevio API README:
 *   pending → confirmed → preparing → out_for_delivery → delivered
 *      └──► cancelled
 * (A shop rejecting an order = cancelled, with a reason.)
 */
export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

/** The happy-path order of statuses (used by StatusTimeline). */
export const ORDER_FLOW = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'];
export const FINISHED_STATUSES = ['DELIVERED', 'CANCELLED'];

/**
 * Who signs in: customers only. Shops and delivery partners are records in the
 * database (managed there directly); they have no app of their own.
 */
export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
});

/** Food only: hotels and bakeries. */
export const SHOP_CATEGORIES = ['hotels', 'bakery'];

export const PAYMENT_METHODS = Object.freeze({ UPI: 'UPI', COD: 'COD' });
export const PAYMENT_STATUS = Object.freeze({ PENDING: 'PENDING', PAID: 'PAID' });

/** Value used in the Place dropdown for "My place is not listed". */
export const PLACE_NOT_LISTED = '__not_listed__';

export const MAX_ITEM_QTY = 20;

export const DEFAULT_SETTINGS = Object.freeze({
  deliveryFee: 20,
  partnerIncentive: 10,
  servicePlaces: [],
  supportPhone: '',
  supportWhatsApp: '',
  platformUpiId: '',
  platformUpiName: '',
});

export const STORAGE_KEYS = Object.freeze({
  SESSION: 'zevio.api.session',
  CART: 'zevio.api.cart',
});
