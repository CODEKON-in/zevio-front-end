/** App-wide constants. Never hardcode these values in components. */

export const IS_DEV = import.meta.env.DEV;

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

/** Which status can move to which. Admin can override with `force`. */
export const ALLOWED_TRANSITIONS = Object.freeze({
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
});

export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'];
export const FINISHED_STATUSES = ['DELIVERED', 'CANCELLED'];

/** A shop's "Reject" is a cancel with a reason. */
export const isRejected = (order) => order?.status === ORDER_STATUS.CANCELLED && Boolean(order.rejectReason);

export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  SHOP: 'shop',
  DELIVERY: 'delivery',
  ADMIN: 'admin',
});

/** Root path of each role's section. */
export const ROLE_HOME = Object.freeze({
  customer: '/',
  shop: '/shop-panel',
  delivery: '/delivery',
  admin: '/admin',
});

/** Food only: hotels and bakeries. */
export const SHOP_CATEGORIES = ['hotels', 'bakery'];

export const PAYMENT_METHODS = Object.freeze({ UPI: 'UPI', COD: 'COD' });
export const PAYMENT_STATUS = Object.freeze({ PENDING: 'PENDING', PAID: 'PAID' });

export const SUBSCRIPTION_STATUS = Object.freeze({
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
});

export const REJECT_REASONS = ['outOfStock', 'shopBusy', 'closingSoon', 'cannotDeliver', 'other'];

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

// API mode keeps its own session/cart so demo logins (ids like "c1") never reach the real API.
const STORAGE_PREFIX = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'zevio.api.' : 'zevio.';

export const STORAGE_KEYS = Object.freeze({
  SESSION: `${STORAGE_PREFIX}session`,
  CART: `${STORAGE_PREFIX}cart`,
  MOCK_DB: `${STORAGE_PREFIX}mockdb`,
});

/** Fake network delay range for mock services (ms). */
export const MOCK_DELAY = { min: 300, max: 600 };
