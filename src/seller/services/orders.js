import { apiRequest, poll, refreshAll } from './api';

const ORDERS_POLL_MS = 8000;

/**
 * Normalizes order status into one of: 'new', 'preparing', 'ready', 'completed', 'rejected'
 * (the API's own lifecycle: pending → confirmed → preparing → out_for_delivery → delivered | cancelled)
 */
export function normalizeStatus(status) {
  const s = (status || '').toLowerCase();
  if (s === 'pending' || s === 'new' || s === 'placed') return 'new';
  if (s === 'preparing' || s === 'confirmed' || s === 'accepted' || s === 'in_progress') return 'preparing';
  if (s === 'ready' || s === 'food_ready' || s === 'out_for_delivery') return 'ready';
  if (s === 'completed' || s === 'delivered') return 'completed';
  if (s === 'rejected' || s === 'cancelled') return 'rejected';
  return 'new';
}

/** An API order row (with `items`) in the shape the screens read. */
function toOrder(raw) {
  return {
    id: raw.id,
    orderNumber: raw.order_number,
    status: raw.status,
    normalizedStatus: normalizeStatus(raw.status),
    createdAt: raw.created_at,
    subtotal: Number(raw.subtotal) || 0,
    deliveryFee: Number(raw.delivery_fee) || 0,
    totalAmount: Number(raw.total_amount) || 0,
    customerName: raw.recipient_name || '',
    customerPhone: raw.recipient_phone || '',
    address: { streetName: raw.delivery_address || '', area: raw.delivery_city || '', landmark: raw.landmark || '' },
    deliveryArea: raw.delivery_city || '',
    landmark: raw.landmark || '',
    notes: raw.instructions || '',
    paymentMethod: raw.payment_method || 'COD',
    paymentStatus: raw.payment_status || '',
    rejectionReason: raw.reject_reason || '',
    items: (raw.items || []).map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.product_name,
      price: Number(i.unit_price) || 0,
      quantity: Number(i.quantity) || 1,
    })),
  };
}

/**
 * Orders for the signed-in seller's shop, newest first, refreshed every few
 * seconds. (The shop is decided by the server from the sign-in; shopId is only
 * a guard that someone is signed in.)
 */
export function subscribeToShopOrders(shopId, callback) {
  if (!shopId) {
    callback({ orders: [], loading: false, error: 'Shop ID not available' });
    return () => {};
  }
  return poll(
    async () => (await apiRequest('/orders')).map(toOrder),
    (orders) => callback({ orders, loading: false, error: null }),
    (err) => callback({ orders: [], loading: false, error: err.message }),
    ORDERS_POLL_MS
  );
}

async function act(path, form) {
  await apiRequest(path, { method: 'POST', form });
  refreshAll();
}

/** Accept an incoming order (moves to 'preparing') */
export async function acceptOrder(orderId) {
  if (!orderId) throw new Error('Order ID is required');
  await act('/order/accept/', { order_id: orderId });
}

/** Reject an order with a reason */
export async function rejectOrder(orderId, reason) {
  if (!orderId) throw new Error('Order ID is required');
  if (!reason) throw new Error('Rejection reason is required');
  await act('/order/reject/', { order_id: orderId, reject_reason: reason });
}

/** Mark an order as ready for pickup / delivery */
export async function markOrderReady(orderId) {
  if (!orderId) throw new Error('Order ID is required');
  await act('/order/ready/', { order_id: orderId });
}

/**
 * Calculate metrics for orders placed today
 */
export function calculateTodayMetrics(orders = []) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let todayCount = 0;
  let todaySales = 0;

  orders.forEach((order) => {
    const orderTime = order.createdAt ? new Date(order.createdAt).getTime() : 0;

    if (orderTime >= startOfToday) {
      todayCount += 1;
      // Do not count rejected or cancelled orders towards sales
      if (order.normalizedStatus !== 'rejected') {
        const total = Number(order.totalAmount || order.total || order.subtotal || 0);
        todaySales += isNaN(total) ? 0 : total;
      }
    }
  });

  return { todayCount, todaySales };
}
