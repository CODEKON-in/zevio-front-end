/**
 * Converts between the Zevio API's records and the shapes the app's screens use.
 *
 * The API does not have columns for everything the app needs yet (shop category,
 * UPI ID, timings, product veg/non-veg, order payment method…). Until it does,
 * those extras travel inside existing text fields so every phone sees them:
 *   - shop/product `description` ends with a line  "#zevio {json}"
 *   - order `delivery_address` holds tagged parts  "street | Landmark: … | Note: … | Pay: COD"
 * Once the backend adds real columns (BACKEND-CHANGES.md), only this file changes.
 */
import { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../../utils/constants.js';
import { loadDb } from '../request.js';

/* ---------------- extras inside description ---------------- */

const META_TAG = '#zevio ';
const META_RE = /(?:^|\n)#zevio (\{.*\})\s*$/s;

export function decodeMeta(description) {
  const text = description || '';
  const m = text.match(META_RE);
  if (!m) return { text: text.trim(), meta: {} };
  let meta = {};
  try {
    meta = JSON.parse(m[1]) || {};
  } catch {
    meta = {};
  }
  return { text: text.slice(0, m.index).trim(), meta };
}

export function encodeMeta(text, meta) {
  const clean = Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined));
  return `${text ? `${text.trim()}\n\n` : ''}${META_TAG}${JSON.stringify(clean)}`;
}

/* ---------------- places (city ↔ placeId) ---------------- */

export async function getPlaces() {
  const db = (await loadDb()).getDb();
  return db.settings?.servicePlaces || [];
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

/* ---------------- shops ---------------- */

const NO_SUBSCRIPTION = { plan: '', status: 'ACTIVE', startDate: null, endDate: null };

export function toShop(raw, places) {
  const { text, meta } = decodeMeta(raw.description);
  return {
    id: raw.id,
    name: raw.shop_name,
    slug: raw.slug,
    description: text,
    category: meta.category || 'hotels',
    placeId: placeIdFromCity(raw.city, places),
    city: raw.city || '',
    address: raw.address || '',
    ownerName: meta.ownerName || '',
    profileId: raw.profile_id,
    phone: raw.contact_phone || '',
    email: raw.contact_email || '',
    upiId: meta.upiId || '',
    timings: meta.timings || { open: '08:00', close: '22:00' },
    isOpen: Boolean(raw.is_accepting_orders),
    isActive: meta.isActive !== false,
    deliveryTime: meta.deliveryTime || '30-40',
    image: raw.cover_image_url || raw.logo_url || null,
    subscription: meta.subscription || NO_SUBSCRIPTION,
    createdAt: raw.created_at,
  };
}

/** The extras of a shop that live in its description. */
export function shopMeta(shop) {
  return {
    category: shop.category,
    ownerName: shop.ownerName,
    upiId: shop.upiId,
    timings: shop.timings,
    deliveryTime: shop.deliveryTime,
    isActive: shop.isActive,
    subscription: shop.subscription && shop.subscription.endDate ? shop.subscription : undefined,
  };
}

/* ---------------- products ---------------- */

export function toProduct(raw) {
  const { text, meta } = decodeMeta(raw.description);
  return {
    id: raw.id,
    shopId: raw.shop_id,
    name: raw.name,
    slug: raw.slug,
    description: text,
    price: Number(raw.price) || 0,
    section: meta.section || '',
    isVeg: typeof meta.isVeg === 'boolean' ? meta.isVeg : null,
    inStock: raw.is_available !== false,
    image: raw.image_url || null,
  };
}

export function productMeta(p) {
  return { section: p.section || undefined, isVeg: typeof p.isVeg === 'boolean' ? p.isVeg : undefined };
}

/* ---------------- order status ---------------- */

/*
 * The app uses the API's own lifecycle (README), only written in capitals:
 *   pending → confirmed → preparing → out_for_delivery → delivered, or cancelled.
 */
/** Status names used by earlier versions of the app → today's names. */
const LEGACY_STATUS = { PLACED: 'PENDING', ACCEPTED: 'CONFIRMED', READY: 'PREPARING', PICKED_UP: 'OUT_FOR_DELIVERY', REJECTED: 'CANCELLED' };

export const toApiStatus = (status) => String(status).toLowerCase();
export function fromApiStatus(apiStatus) {
  const st = String(apiStatus || 'pending').toUpperCase();
  return ORDER_STATUS[st] || ORDER_STATUS.PENDING;
}

/* ---------------- order address ---------------- */

const TAGS = { landmark: 'Landmark', notes: 'Directions', instructions: 'Note', payment: 'Pay' };
const tidy = (v, max) => String(v || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, max);

/** Packs address + order extras into the API's single `delivery_address` text (max 500). */
export function encodeAddress({ street, landmark, notes }, { instructions, paymentMethod }) {
  const parts = [tidy(street, 200) || '-'];
  if (landmark) parts.push(`${TAGS.landmark}: ${tidy(landmark, 100)}`);
  if (notes) parts.push(`${TAGS.notes}: ${tidy(notes, 80)}`);
  if (instructions) parts.push(`${TAGS.instructions}: ${tidy(instructions, 80)}`);
  if (paymentMethod) parts.push(`${TAGS.payment}: ${paymentMethod}`);
  return parts.join(' | ').slice(0, 500);
}

export function decodeAddress(text) {
  const out = { street: '', landmark: '', notes: '', instructions: '', paymentMethod: null };
  const rest = [];
  for (const part of String(text || '').split(' | ')) {
    const m = part.match(/^(Landmark|Directions|Note|Pay):\s*(.*)$/);
    if (!m) rest.push(part);
    else if (m[1] === TAGS.landmark) out.landmark = m[2];
    else if (m[1] === TAGS.notes) out.notes = m[2];
    else if (m[1] === TAGS.instructions) out.instructions = m[2];
    else if (m[1] === TAGS.payment) out.paymentMethod = m[2] === PAYMENT_METHODS.UPI ? PAYMENT_METHODS.UPI : PAYMENT_METHODS.COD;
  }
  out.street = rest.join(' | ').replace(/^-$/, '');
  return out;
}

/* ---------------- orders ---------------- */

/**
 * @param raw   API order
 * @param items API order items
 * @param shop  mapped shop (may be null if deleted)
 * @param extra this device's notes about the order { partnerId, rejectReason, paymentStatus, history }
 */
export function toOrder(raw, items, shop, extra = {}, places = []) {
  const addr = decodeAddress(raw.delivery_address);
  const status = fromApiStatus(raw.status);
  const paymentMethod = addr.paymentMethod || PAYMENT_METHODS.COD;
  const paid =
    paymentMethod === PAYMENT_METHODS.UPI || status === ORDER_STATUS.DELIVERED || extra.paymentStatus === PAYMENT_STATUS.PAID;

  // Times: the API only stores when the order was created; later steps are
  // timed when this device saw/made the change.
  const history = [{ status: ORDER_STATUS.PENDING, at: raw.created_at }];
  for (const h of extra.history || []) {
    // Times saved on this phone; older app versions used other status names.
    const st = ORDER_STATUS[LEGACY_STATUS[h.status] || h.status];
    if (st && st !== ORDER_STATUS.PENDING && !history.some((x) => x.status === st)) history.push({ status: st, at: h.at });
  }
  if (!history.some((h) => h.status === status) && status !== ORDER_STATUS.PENDING) history.push({ status, at: null });

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
    paymentStatus: paid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
    address: {
      name: raw.recipient_name,
      phone: raw.recipient_phone,
      placeId: placeIdFromCity(raw.delivery_city, places),
      street: addr.street,
      landmark: addr.landmark,
      notes: addr.notes,
    },
    instructions: addr.instructions,
    status,
    statusHistory: history.filter((h) => h.at !== null || h.status === status),
    partnerId: extra.partnerId || null,
    rejectReason: extra.rejectReason || null,
    createdAt: raw.created_at,
  };
}
