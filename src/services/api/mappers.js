/**
 * Converts between the Zevio API's records and the shapes the app's screens use.
 *
 * Every field below is a real column. Earlier versions packed the fields the
 * database did not have into existing text ones — shop extras as a "#zevio {json}"
 * line inside `description`, order extras as tags inside `delivery_address`. The
 * migration in Zevio-delivery-app/database/migrations/ added the columns, so that
 * is gone: what a screen shows is what the database holds.
 */
import { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../../utils/constants.js';
import { getPlacesOrEmpty } from './apiSettings.js';

/* ---------------- places (city ↔ placeId) ---------------- */

/** The service area, as [{ id, name }]. */
export function getPlaces() {
  return getPlacesOrEmpty();
}

const norm = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export function placeIdFromCity(city, places) {
  const n = norm(city);
  const hit = places.find((p) => norm(p.id) === n || norm(p.name) === n);
  return hit ? hit.id : n;
}

export function cityFromPlaceId(placeId, places) {
  return places.find((p) => p.id === placeId)?.name || placeId || '';
}

/* ---------------- slugs ---------------- */

export function makeSlug(name) {
  const base = String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------------- times ---------------- */

/** Postgres `time` comes back as 'HH:MM:SS'; the form inputs want 'HH:MM'. */
const toHourMinute = (value, fallback) => (typeof value === 'string' && value.length >= 5 ? value.slice(0, 5) : fallback);

/* ---------------- shops ---------------- */

const NO_SUBSCRIPTION = { plan: '', status: 'ACTIVE', startDate: null, endDate: null };

export function toShop(raw, places) {
  const subscription = raw.subscription_end || raw.subscription_plan
    ? {
        plan: raw.subscription_plan || '',
        status: raw.subscription_status || 'ACTIVE',
        startDate: raw.subscription_start || null,
        endDate: raw.subscription_end || null,
      }
    : NO_SUBSCRIPTION;

  return {
    id: raw.id,
    name: raw.shop_name,
    slug: raw.slug,
    description: raw.description || '',
    category: raw.category || 'hotels',
    placeId: placeIdFromCity(raw.city, places),
    city: raw.city || '',
    address: raw.address || '',
    ownerName: raw.owner_name || '',
    profileId: raw.profile_id,
    phone: raw.contact_phone || '',
    email: raw.contact_email || '',
    upiId: raw.upi_id || '',
    timings: { open: toHourMinute(raw.open_time, '08:00'), close: toHourMinute(raw.close_time, '22:00') },
    isOpen: Boolean(raw.is_accepting_orders),
    isActive: raw.is_active !== false,
    deliveryTime: raw.delivery_time || '30-40',
    image: raw.cover_image_url || raw.logo_url || null,
    subscription,
    createdAt: raw.created_at,
  };
}

/** The app's shop object → the API's columns. Only defined fields are included. */
export function shopColumns(shop, places) {
  const columns = {
    shop_name: shop.name,
    description: shop.description,
    contact_phone: shop.phone,
    contact_email: shop.email,
    address: shop.address,
    category: shop.category,
    owner_name: shop.ownerName,
    upi_id: shop.upiId,
    delivery_time: shop.deliveryTime,
  };
  if (shop.placeId !== undefined) columns.city = cityFromPlaceId(shop.placeId, places);
  if (shop.timings?.open) columns.open_time = shop.timings.open;
  if (shop.timings?.close) columns.close_time = shop.timings.close;
  if (typeof shop.isActive === 'boolean') columns.is_active = shop.isActive;
  if (shop.subscription) {
    columns.subscription_plan = shop.subscription.plan;
    columns.subscription_status = shop.subscription.status;
    columns.subscription_start = shop.subscription.startDate;
    columns.subscription_end = shop.subscription.endDate;
  }
  if (isWebUrl(shop.image)) columns.cover_image_url = shop.image;
  return clean(columns);
}

export const isWebUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v) && v.length <= 500;

/** Drops keys the caller did not set, so an update never blanks a column by accident. */
function clean(columns) {
  return Object.fromEntries(Object.entries(columns).filter(([, v]) => v !== undefined));
}

/* ---------------- products ---------------- */

export function toProduct(raw) {
  return {
    id: raw.id,
    shopId: raw.shop_id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description || '',
    price: Number(raw.price) || 0,
    section: raw.section || '',
    isVeg: typeof raw.is_veg === 'boolean' ? raw.is_veg : null,
    inStock: raw.is_available !== false,
    image: raw.image_url || null,
  };
}

export function productColumns(product) {
  const columns = {
    name: product.name,
    description: product.description,
    price: product.price,
    section: product.section,
  };
  if (typeof product.isVeg === 'boolean') columns.is_veg = product.isVeg;
  if (typeof product.inStock === 'boolean') columns.is_available = product.inStock;
  if (isWebUrl(product.image)) columns.image_url = product.image;
  return clean(columns);
}

/* ---------------- order status ---------------- */

/*
 * The app uses the API's own lifecycle, only written in capitals:
 *   pending → confirmed → preparing → out_for_delivery → delivered, or cancelled.
 */
export const toApiStatus = (status) => String(status).toLowerCase();

export function fromApiStatus(apiStatus) {
  const st = String(apiStatus || 'pending').toUpperCase();
  return ORDER_STATUS[st] || ORDER_STATUS.PENDING;
}

/** status → the column holding the moment it happened. */
const STATUS_AT = {
  [ORDER_STATUS.CONFIRMED]: 'confirmed_at',
  [ORDER_STATUS.PREPARING]: 'preparing_at',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'out_for_delivery_at',
  [ORDER_STATUS.DELIVERED]: 'delivered_at',
  [ORDER_STATUS.CANCELLED]: 'cancelled_at',
};

/* ---------------- orders ---------------- */

/**
 * @param raw   API order
 * @param items its line items
 * @param shop  mapped shop (may be null if the shop was deleted)
 * @param places service area
 */
export function toOrder(raw, items, shop, places = []) {
  const status = fromApiStatus(raw.status);
  const paymentMethod = raw.payment_method === PAYMENT_METHODS.UPI ? PAYMENT_METHODS.UPI : PAYMENT_METHODS.COD;

  // Every step's time is a column, so the timeline reads the same on every phone.
  const history = [{ status: ORDER_STATUS.PENDING, at: raw.created_at }];
  for (const [st, column] of Object.entries(STATUS_AT)) {
    if (raw[column]) history.push({ status: st, at: raw[column] });
  }
  history.sort((a, b) => new Date(a.at) - new Date(b.at));
  if (!history.some((h) => h.status === status)) history.push({ status, at: null });

  const lines = (items || []).map((i) => ({
    productId: i.product_id,
    name: i.product_name,
    price: Number(i.unit_price) || 0,
    qty: Number(i.quantity) || 1,
    isVeg: null,
  }));
  const itemTotal = Number(raw.subtotal) || lines.reduce((n, l) => n + l.price * l.qty, 0);
  const deliveryFee = Number(raw.delivery_fee) || 0;

  return {
    id: raw.id,
    number: raw.order_number,
    customerId: raw.customer_id,
    customerName: raw.recipient_name,
    customerPhone: raw.recipient_phone,
    shopId: raw.shop_id,
    shopName: shop?.name || '—',
    shopPhone: shop?.phone || '',
    shopPlaceId: shop?.placeId || '',
    items: lines,
    itemTotal,
    deliveryFee,
    total: Number(raw.total_amount) || itemTotal + deliveryFee,
    paymentMethod,
    paymentStatus: raw.payment_status === PAYMENT_STATUS.PAID ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
    address: {
      name: raw.recipient_name,
      phone: raw.recipient_phone,
      placeId: placeIdFromCity(raw.delivery_city, places),
      // The city as stored, so a place that is not in the service list still shows.
      city: raw.delivery_city || '',
      street: raw.delivery_address || '',
      landmark: raw.landmark || '',
      notes: raw.directions || '',
    },
    instructions: raw.instructions || '',
    status,
    statusHistory: history.filter((h) => h.at !== null || h.status === status),
    partnerId: raw.delivery_partner_id || null,
    rejectReason: raw.reject_reason || null,
    createdAt: raw.created_at,
  };
}

/* ---------------- people ---------------- */

export function toCustomer(raw, orderCount = 0) {
  return {
    id: raw.id,
    name: raw.name || '',
    phone: raw.phone || '',
    email: raw.email || '',
    isBlocked: raw.is_blocked === true,
    orderCount,
    addresses: [],
    createdAt: raw.created_at,
  };
}

export function toPartner(raw, places = [], todayDeliveries = 0) {
  return {
    id: raw.id,
    name: raw.name || '',
    phone: raw.phone || '',
    email: raw.email || '',
    vehicle: raw.vehicle || '',
    placeId: placeIdFromCity(raw.base_place, places),
    isOnline: raw.is_online === true,
    isActive: raw.is_active !== false,
    todayDeliveries,
    createdAt: raw.created_at,
  };
}
