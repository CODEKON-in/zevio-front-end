/** Orders from the Zevio API. */
import { apiGet, apiPost } from './client.js';
import { cityFromPlaceId, getPlaces, toOrder } from './mappers.js';
import { fetchShops, getProductsByShop, getShopById } from './apiShops.js';
import { fetchRawSettings } from './apiSettings.js';
import { ServiceError } from '../../utils/errors.js';
import { canCancelOrder } from '../../utils/orderRules.js';
import { isSameDay } from '../../utils/format.js';

/* ---------- items (never change after the order is placed → cached) ---------- */

const itemsCache = new Map();

async function getItems(orderId) {
  if (itemsCache.has(orderId)) return itemsCache.get(orderId);
  const items = (await apiGet(`/order/${orderId}/items/`)) || [];
  itemsCache.set(orderId, items);
  return items;
}

/** Items for a whole list in one request, instead of one call per order. */
async function loadItems(orderIds) {
  const missing = orderIds.filter((id) => !itemsCache.has(id));
  for (let i = 0; i < missing.length; i += 150) {
    const batch = missing.slice(i, i + 150);
    try {
      const rows = (await apiGet('/order/items/', { order_ids: batch.join(',') })) || [];
      const byOrder = {};
      for (const row of rows) (byOrder[row.order_id] ||= []).push(row);
      for (const id of batch) itemsCache.set(id, byOrder[id] || []);
    } catch {
      // Older deployment without the batch endpoint: fall back to one at a time.
      await Promise.all(batch.map((id) => getItems(id).catch(() => [])));
    }
  }
  return Object.fromEntries(orderIds.map((id) => [id, itemsCache.get(id) || []]));
}

async function mapOrders(rows) {
  const [shops, places, items] = await Promise.all([
    fetchShops(),
    getPlaces(),
    loadItems(rows.map((r) => r.id)),
  ]);
  const shopById = Object.fromEntries(shops.map((s) => [s.id, s]));
  return rows.map((r) => toOrder(r, items[r.id], shopById[r.shop_id], places));
}

/**
 * List orders, newest first. The API lists by customer, shop or partner, and
 * `GET /api/orders/` returns every order (not used by this app).
 */
/** A customer's orders, newest first. Optional filters: status (one or a list), placeId, date, query. */
export async function getOrders(filters = {}) {
  const { customerId, status, placeId, date, query } = filters;
  if (!customerId) return [];
  const rows = await apiGet(`/orders/by-customer/${customerId}`);

  const statuses = status ? [].concat(status) : null;
  const q = query?.trim().toLowerCase();
  const orders = await mapOrders(rows || []);
  return orders
    .filter((o) => !statuses || statuses.includes(o.status))
    .filter((o) => !placeId || o.address.placeId === placeId)
    .filter((o) => !date || isSameDay(o.createdAt, date))
    .filter((o) => !q || String(o.number).toLowerCase().includes(q) || o.shopName.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getOrderById(id) {
  const raw = await apiGet(`/order/${id}`);
  const [items, shop, places] = await Promise.all([
    getItems(id),
    getShopById(raw.shop_id).catch(() => null),
    getPlaces(),
  ]);
  return toOrder(raw, items, shop, places);
}

/** Place an order. Prices and stock are re-read from the API (never trust the cart). */
export async function placeOrder({ customer, cart, address, paymentMethod, isGiftOrder = false }) {
  if (!cart?.items?.length) throw new ServiceError('CART_EMPTY');
  const [shop, products, places, settings, profile] = await Promise.all([
    getShopById(cart.shopId),
    getProductsByShop(cart.shopId),
    getPlaces(),
    fetchRawSettings(),
    apiGet(`/user/${customer.id}`).catch(() => null),
  ]);
  if (!shop.isActive) throw new ServiceError('NOT_FOUND');
  if (!shop.isOpen) throw new ServiceError('SHOP_CLOSED');
  if (profile?.is_blocked) throw new ServiceError('BLOCKED');

  const lines = cart.items.map(({ productId, qty }) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || !prod.inStock) throw new ServiceError('OUT_OF_STOCK');
    return { product_id: prod.id, product_name: prod.name, unit_price: prod.price, quantity: Math.max(1, Math.round(qty)) };
  });
  const subtotal = lines.reduce((n, l) => n + l.unit_price * l.quantity, 0);
  const deliveryFee = Number(settings?.delivery_fee) || 0;

  const data = await apiPost('/order/place/', {
    customer_id: customer.id,
    shop_id: shop.id,
    recipient_name: address.name || customer.name,
    recipient_phone: address.phone || customer.phone,
    delivery_address: address.street || '-',
    delivery_city: cityFromPlaceId(address.placeId, places) || shop.city,
    landmark: address.landmark || undefined,
    directions: address.notes || undefined,
    instructions: cart.instructions || undefined,
    payment_method: paymentMethod,
    ...(isGiftOrder ? { is_gift_order: true } : {}),
    subtotal,
    delivery_fee: deliveryFee,
    total_amount: subtotal + deliveryFee,
    items: JSON.stringify(lines),
  });
  if (!data?.order_id) throw new ServiceError('SERVER');
  return getOrderById(data.order_id);
}

/**
 * Customer cancel. Reads the order again first, so an order that went out for
 * delivery a moment ago is refused with NOT_CANCELLABLE rather than cancelled.
 */
export async function cancelOrder(id, reason) {
  const current = await getOrderById(id);
  if (!canCancelOrder(current)) throw new ServiceError('NOT_CANCELLABLE');
  await apiPost('/order/cancel/', { order_id: id, ...(reason ? { reject_reason: reason } : {}) });
  return getOrderById(id);
}

