/** Orders from the Zevio API. */
import { apiGet, apiPost } from './client.js';
import { encodeAddress, cityFromPlaceId, getPlaces, toApiStatus, toOrder } from './mappers.js';
import { fetchShops, getProductsByShop, getShopById } from './apiShops.js';
import { loadDb } from '../request.js';
import { ServiceError } from '../../utils/mock.js';
import { ALLOWED_TRANSITIONS, ORDER_STATUS, PAYMENT_STATUS } from '../../utils/constants.js';
import { isSameDay } from '../../utils/format.js';

/* ---------- things the API cannot store yet, kept on this device ---------- */

async function local() {
  const mod = await loadDb();
  const db = mod.getDb();
  if (!db.apiExtras) db.apiExtras = { orders: {} };
  return { db, extras: db.apiExtras.orders, commit: mod.commit };
}

async function patchExtra(orderId, fn) {
  const { extras, commit } = await local();
  extras[orderId] = fn({ ...(extras[orderId] || {}) });
  commit();
}

/* ---------- items (never change after the order is placed → cached) ---------- */

const itemsCache = new Map();
async function getItems(orderId) {
  if (itemsCache.has(orderId)) return itemsCache.get(orderId);
  const items = (await apiGet(`/order/${orderId}/items/`)) || [];
  itemsCache.set(orderId, items);
  return items;
}

async function mapOrders(rows) {
  const [shops, places, { extras }] = await Promise.all([fetchShops(), getPlaces(), local()]);
  const shopById = Object.fromEntries(shops.map((s) => [s.id, s]));
  const items = await Promise.all(rows.map((r) => getItems(r.id).catch(() => [])));
  return rows.map((r, i) => toOrder(r, items[i], shopById[r.shop_id], extras[r.id], places));
}

/**
 * Same filters as the demo version. The API can list by customer or by shop;
 * "all orders" (admin) is put together shop by shop.
 */
export async function getOrders(filters = {}) {
  const { customerId, shopId, status, placeId, date, query } = filters;
  let rows;
  if (customerId) rows = await apiGet(`/orders/by-customer/${customerId}`);
  else if (shopId) rows = await apiGet(`/orders/by-shop/${shopId}`);
  else {
    const shops = await fetchShops(true);
    const lists = await Promise.all(shops.map((s) => apiGet(`/orders/by-shop/${s.id}`).catch(() => [])));
    rows = lists.flat();
  }
  if (customerId && shopId) rows = rows.filter((r) => r.shop_id === shopId);

  const statuses = status ? [].concat(status) : null;
  const q = query?.trim().toLowerCase();
  const orders = await mapOrders(rows || []);
  return orders
    .filter((o) => !statuses || statuses.includes(o.status))
    .filter((o) => !placeId || o.address.placeId === placeId)
    .filter((o) => !date || isSameDay(o.createdAt, date))
    .filter((o) => !q || String(o.number).toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.shopName.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getOrderById(id) {
  const raw = await apiGet(`/order/${id}`);
  const [items, shop, places, { extras }] = await Promise.all([
    getItems(id),
    getShopById(raw.shop_id).catch(() => null),
    getPlaces(),
    local(),
  ]);
  return toOrder(raw, items, shop, extras[id], places);
}

/** Place an order. Prices and stock are re-read from the API (never trust the cart). */
export async function placeOrder({ customer, cart, address, paymentMethod }) {
  if (!cart?.items?.length) throw new ServiceError('CART_EMPTY');
  const [shop, products, places, { db }] = await Promise.all([
    getShopById(cart.shopId),
    getProductsByShop(cart.shopId),
    getPlaces(),
    local(),
  ]);
  if (!shop.isActive) throw new ServiceError('NOT_FOUND');
  if (!shop.isOpen) throw new ServiceError('SHOP_CLOSED');
  if (db.customers.find((c) => c.id === customer.id)?.isBlocked) throw new ServiceError('BLOCKED');

  const lines = cart.items.map(({ productId, qty }) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || !prod.inStock) throw new ServiceError('OUT_OF_STOCK');
    return { product_id: prod.id, product_name: prod.name, unit_price: prod.price, quantity: Math.max(1, Math.round(qty)) };
  });
  const subtotal = lines.reduce((n, l) => n + l.unit_price * l.quantity, 0);
  const deliveryFee = Number(db.settings?.deliveryFee) || 0;

  const data = await apiPost('/order/place/', {
    customer_id: customer.id,
    shop_id: shop.id,
    recipient_name: address.name || customer.name,
    recipient_phone: address.phone || customer.phone,
    delivery_address: encodeAddress(address, { instructions: cart.instructions, paymentMethod }),
    delivery_city: cityFromPlaceId(address.placeId, places) || shop.city,
    subtotal,
    delivery_fee: deliveryFee,
    total_amount: subtotal + deliveryFee,
    items: JSON.stringify(lines),
  });
  if (!data?.order_id) throw new ServiceError('SERVER');
  return getOrderById(data.order_id);
}

export async function updateOrderStatus(id, status, options = {}) {
  const current = await getOrderById(id);
  if (!options.force && !ALLOWED_TRANSITIONS[current.status]?.includes(status)) {
    throw new ServiceError('INVALID_STATUS');
  }
  await apiPost('/order/update-status/', { order_id: id, status: toApiStatus(status) });
  await patchExtra(id, (x) => ({
    ...x,
    rejectReason: status === ORDER_STATUS.CANCELLED ? options.reason || null : null,
    history: [...(x.history || []).filter((h) => h.status !== status), { status, at: new Date().toISOString() }],
  }));
  return getOrderById(id);
}

export function cancelOrder(id) {
  return updateOrderStatus(id, ORDER_STATUS.CANCELLED);
}

/** Partners are not in the API yet: the assignment is kept on this device. */
export async function assignPartner(orderId, partnerId) {
  await patchExtra(orderId, (x) => ({ ...x, partnerId }));
  return getOrderById(orderId);
}

export async function markOrderPaid(orderId) {
  await patchExtra(orderId, (x) => ({ ...x, paymentStatus: PAYMENT_STATUS.PAID }));
  return getOrderById(orderId);
}

export async function getDailyOrderCounts(days = 7) {
  const orders = await getOrders();
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    result.push({ date: d.toISOString(), count: orders.filter((o) => isSameDay(o.createdAt, d)).length });
  }
  return result;
}
