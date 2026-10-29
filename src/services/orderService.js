import { request } from './request.js';
import { USE_API, isApiId } from './api/config.js';
import * as api from './api/apiOrders.js';
import { ServiceError } from '../utils/mock.js';
import { ALLOWED_TRANSITIONS, ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../utils/constants.js';
import { isSameDay } from '../utils/format.js';

/**
 * List orders, newest first.
 * @param {{customerId?:string, shopId?:string, partnerId?:string, status?:string|string[], placeId?:string, date?:string|number, query?:string}} [filters]
 */
export function getOrders(filters = {}) {
  // Delivery partners are not in the API yet, so their lists stay on demo data.
  if (USE_API && !filters.partnerId && (!filters.customerId || isApiId(filters.customerId)) && (!filters.shopId || isApiId(filters.shopId))) {
    return api.getOrders(filters);
  }
  return request(({ getDb, commit }) => {
    const { customerId, shopId, partnerId, status, placeId, date, query } = filters;
    const statuses = status ? [].concat(status) : null;
    const q = query?.trim().toLowerCase();
    return getDb()
      .orders.filter((o) => !customerId || o.customerId === customerId)
      .filter((o) => !shopId || o.shopId === shopId)
      .filter((o) => !partnerId || o.partnerId === partnerId)
      .filter((o) => !statuses || statuses.includes(o.status))
      .filter((o) => !placeId || o.address.placeId === placeId)
      .filter((o) => !date || isSameDay(o.createdAt, date))
      .filter((o) => !q || String(o.number).includes(q) || o.customerName.toLowerCase().includes(q) || o.shopName.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });
}

export function getOrderById(id) {
  if (isApiId(id)) return api.getOrderById(id);
  return request(({ getDb, commit }) => {
    const order = getDb().orders.find((o) => o.id === id);
    if (!order) throw new ServiceError('NOT_FOUND');
    return order;
  });
}

/**
 * Place an order. Prices are re-read from the product list (never trust the cart).
 * @param {{customer:{id,name,phone}, cart:{shopId, items:Array<{productId, qty}>, instructions?:string}, address:object, paymentMethod:'UPI'|'COD'}} input
 */
export function placeOrder({ customer, cart, address, paymentMethod }) {
  if (isApiId(cart?.shopId)) return api.placeOrder({ customer, cart, address, paymentMethod });
  return request(({ getDb, commit }) => {
    const db = getDb();
    if (!cart?.items?.length) throw new ServiceError('CART_EMPTY');
    const shop = db.shops.find((s) => s.id === cart.shopId);
    if (!shop || !shop.isActive) throw new ServiceError('NOT_FOUND');
    if (!shop.isOpen) throw new ServiceError('SHOP_CLOSED');
    const dbCustomer = db.customers.find((c) => c.id === customer.id);
    if (dbCustomer?.isBlocked) throw new ServiceError('BLOCKED');

    const lines = cart.items.map(({ productId, qty }) => {
      const prod = db.products.find((p) => p.id === productId && p.shopId === shop.id);
      if (!prod || !prod.inStock) throw new ServiceError('OUT_OF_STOCK');
      return { productId, name: prod.name, price: prod.price, qty, isVeg: prod.isVeg };
    });
    const itemTotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const deliveryFee = db.settings.deliveryFee;
    const now = new Date().toISOString();
    const number = db.nextOrderNumber++;

    const order = {
      id: `o${number}`,
      number,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      shopId: shop.id,
      shopName: shop.name,
        shopPhone: shop.phone,
      shopPlaceId: shop.placeId,
      items: lines,
      itemTotal,
      deliveryFee,
      total: itemTotal + deliveryFee,
      paymentMethod,
      paymentStatus: paymentMethod === PAYMENT_METHODS.UPI ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
      address: { ...address },
      instructions: cart.instructions || '',
      status: ORDER_STATUS.PENDING,
      statusHistory: [{ status: ORDER_STATUS.PENDING, at: now }],
      partnerId: null,
      rejectReason: null,
      createdAt: now,
    };
    db.orders.push(order);
    commit();
    return order;
  });
}

/**
 * Move an order to a new status.
 * @param {string} id
 * @param {string} status one of ORDER_STATUS
 * @param {{reason?:string, force?:boolean}} [options] force = admin manual change (skips flow rules)
 */
export function updateOrderStatus(id, status, options = {}) {
  if (isApiId(id)) return api.updateOrderStatus(id, status, options);
  return request(({ getDb, commit }) => {
    const db = getDb();
    const order = db.orders.find((o) => o.id === id);
    if (!order) throw new ServiceError('NOT_FOUND');
    if (!options.force && !ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
      throw new ServiceError('INVALID_STATUS');
    }
    order.status = status;
    order.statusHistory.push({ status, at: new Date().toISOString() });
    // A shop's reject = cancelled with a reason.
    if (status === ORDER_STATUS.CANCELLED) order.rejectReason = options.reason || null;
    if (status === ORDER_STATUS.DELIVERED) order.paymentStatus = PAYMENT_STATUS.PAID;
    commit();
    return order;
  });
}

/** Customer cancel — only allowed while PENDING. */
export function cancelOrder(id) {
  return updateOrderStatus(id, ORDER_STATUS.CANCELLED);
}

/** Assign or reassign a delivery partner (admin). Pass null to unassign. */
export function assignPartner(orderId, partnerId) {
  if (isApiId(orderId)) return api.assignPartner(orderId, partnerId);
  return request(({ getDb, commit }) => {
    const db = getDb();
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) throw new ServiceError('NOT_FOUND');
    order.partnerId = partnerId;
    commit();
    return order;
  });
}

export function markOrderPaid(orderId) {
  if (isApiId(orderId)) return api.markOrderPaid(orderId);
  return request(({ getDb, commit }) => {
    const db = getDb();
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) throw new ServiceError('NOT_FOUND');
    order.paymentStatus = PAYMENT_STATUS.PAID;
    commit();
    return order;
  });
}

/** Order counts for the last `days` days, oldest first: [{date:'YYYY-MM-DD', count}] */
export function getDailyOrderCounts(days = 7) {
  if (USE_API) return api.getDailyOrderCounts(days);
  return request(({ getDb, commit }) => {
    const orders = getDb().orders;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      result.push({ date: d.toISOString(), count: orders.filter((o) => isSameDay(o.createdAt, d)).length });
    }
    return result;
  });
}
