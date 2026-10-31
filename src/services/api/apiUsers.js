/**
 * Customers and delivery partners from the Zevio API.
 *
 * Both lists are rows in `profiles` (GET /api/users/?user_type=…). Before the
 * admin endpoints existed these screens could only show the people who had
 * signed in on this one browser; now they show everyone in the database.
 *
 * A customer's saved addresses are still per-device (the API has no addresses
 * table yet — see BACKEND-CHANGES.md §D), so the admin table shows the place of
 * their most recent order instead, which is real order data.
 */
import { apiGet, apiPost } from './client.js';
import { getPlaces, placeIdFromCity, toCustomer, toPartner } from './mappers.js';
import { ServiceError, newUuid } from '../../utils/errors.js';
import { ORDER_STATUS } from '../../utils/constants.js';
import { isSameDay } from '../../utils/format.js';

/** Raw order rows, used only for counting. Cached briefly: both lists want them. */
const ORDERS_TTL = 15000;
let ordersCache = { at: 0, rows: null };

async function orderRows() {
  if (ordersCache.rows && Date.now() - ordersCache.at < ORDERS_TTL) return ordersCache.rows;
  const rows = (await apiGet('/orders/')) || [];
  ordersCache = { at: Date.now(), rows };
  return rows;
}

export function forgetOrderCounts() {
  ordersCache = { at: 0, rows: null };
}

/* ---------------- customers ---------------- */

export async function getCustomers() {
  const [rows, orders, places] = await Promise.all([
    apiGet('/users/?user_type=customer'),
    orderRows().catch(() => []),
    getPlaces(),
  ]);

  const counts = {};
  const latestCity = {};
  // Orders arrive newest first, so the first one seen is the most recent.
  for (const o of orders) {
    counts[o.customer_id] = (counts[o.customer_id] || 0) + 1;
    if (latestCity[o.customer_id] === undefined) latestCity[o.customer_id] = o.delivery_city;
  }

  return (rows || []).map((raw) => {
    const customer = toCustomer(raw, counts[raw.id] || 0);
    const city = latestCity[raw.id];
    // The Place column reads this; an empty list is correct for someone who has
    // not ordered yet, rather than a made-up address.
    if (city) {
      customer.addresses = [{ id: `latest-${raw.id}`, placeId: placeIdFromCity(city, places), city, street: '' }];
    }
    return customer;
  });
}

export async function getCustomerById(id) {
  const [raw, orders] = await Promise.all([apiGet(`/user/${id}`), orderRows().catch(() => [])]);
  return toCustomer(raw, orders.filter((o) => o.customer_id === id).length);
}

export async function updateCustomer(id, patch) {
  const attrs = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.isBlocked !== undefined ? { is_blocked: patch.isBlocked } : {}),
  };
  for (const [attr, attr_value] of Object.entries(attrs)) {
    await apiPost('/user/update/', { uid: id, attr, attr_value });
  }
  return getCustomerById(id);
}

export function setCustomerBlocked(id, isBlocked) {
  return updateCustomer(id, { isBlocked });
}

/* ---------------- delivery partners ---------------- */

/** Deliveries a partner completed today, from the orders themselves. */
function countToday(orders, partnerId) {
  const now = Date.now();
  return orders.filter(
    (o) => o.delivery_partner_id === partnerId
      && String(o.status).toUpperCase() === ORDER_STATUS.DELIVERED
      && isSameDay(o.delivered_at || o.created_at, now),
  ).length;
}

export async function getPartners() {
  const [rows, orders, places] = await Promise.all([
    apiGet('/users/?user_type=delivery_person'),
    orderRows().catch(() => []),
    getPlaces(),
  ]);
  return (rows || [])
    .map((raw) => toPartner(raw, places, countToday(orders, raw.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPartnerById(id) {
  const [raw, orders, places] = await Promise.all([
    apiGet(`/user/${id}`),
    orderRows().catch(() => []),
    getPlaces(),
  ]);
  if (raw?.user_type !== 'delivery_person') throw new ServiceError('NOT_FOUND');
  return toPartner(raw, places, countToday(orders, id));
}

/** Create (no id) or update a delivery partner. Creating adds a real profile row. */
export async function savePartner(partner) {
  if (!partner.id) {
    if (!partner.name || !partner.phone) throw new ServiceError('LOGIN_DETAILS');
    const id = newUuid();
    await apiPost('/user/add/', {
      uid: id,
      name: partner.name,
      phone: partner.phone,
      user_type: 'delivery_person',
      ...(partner.vehicle ? { vehicle: partner.vehicle } : {}),
      ...(partner.placeId ? { base_place: partner.placeId } : {}),
      is_active: partner.isActive !== false,
    });
    forgetOrderCounts();
    return getPartnerById(id);
  }

  const attrs = {
    ...(partner.name !== undefined ? { name: partner.name } : {}),
    ...(partner.phone !== undefined ? { phone: partner.phone } : {}),
    ...(partner.vehicle !== undefined ? { vehicle: partner.vehicle } : {}),
    ...(partner.placeId !== undefined ? { base_place: partner.placeId } : {}),
    ...(partner.isActive !== undefined ? { is_active: partner.isActive } : {}),
    ...(partner.isOnline !== undefined ? { is_online: partner.isOnline } : {}),
  };
  for (const [attr, attr_value] of Object.entries(attrs)) {
    await apiPost('/user/update/', { uid: partner.id, attr, attr_value });
  }
  return getPartnerById(partner.id);
}

export function setPartnerOnline(id, isOnline) {
  return savePartner({ id, isOnline });
}
