/** DEV-only helpers used by the role switcher and test buttons. */
import { loadDb, request } from './request.js';
import { assignPartner, placeOrder, updateOrderStatus } from './orderService.js';
import { ServiceError } from '../utils/mock.js';
import { isApiId } from './api/config.js';
import { getProductsByShop as apiProducts, getShopById as apiShop } from './api/apiShops.js';
import { loginCustomer } from './api/apiAuth.js';

export { failNextRequest } from './request.js';

export function resetDemoData() {
  return request(({ resetDb }) => {
    resetDb();
    return true;
  });
}

/** Creates a random COD order for a shop from a demo customer (to test new-order alerts). */
export async function simulateOrder(shopId) {
  if (isApiId(shopId)) return simulateApiOrder(shopId);
  const db = (await loadDb()).getDb();
  const products = db.products.filter((p) => p.shopId === shopId && p.inStock);
  if (!products.length) throw new ServiceError('OUT_OF_STOCK');
  const customer = db.customers.find((c) => !c.isBlocked && c.addresses.length);
  const picks = [...products].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
  return placeOrder({
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    cart: { shopId, items: picks.map((p) => ({ productId: p.id, qty: 1 + Math.floor(Math.random() * 2) })), instructions: '' },
    address: customer.addresses[0],
    paymentMethod: Math.random() > 0.5 ? 'UPI' : 'COD',
  });
}

/**
 * Gives a delivery partner something to deliver: assigns an unassigned
 * Accepted/Ready order, or creates a new one at an open shop and moves it to Ready.
 */
export async function assignOrderTo(partnerId) {
  const db = (await loadDb()).getDb();
  let order = db.orders.find((o) => !o.partnerId && (o.status === 'PREPARING' || o.status === 'CONFIRMED'));
  if (!order) {
    const shop = db.shops.find((s) => s.isOpen && s.isActive && db.products.some((p) => p.shopId === s.id && p.inStock));
    if (!shop) throw new ServiceError('NOT_FOUND');
    order = await simulateOrder(shop.id);
    await updateOrderStatus(order.id, 'CONFIRMED');
    await updateOrderStatus(order.id, 'PREPARING');
  }
  return assignPartner(order.id, partnerId);
}

/** API mode: a real order in the API from a test customer profile. */
async function simulateApiOrder(shopId) {
  const [shop, all] = await Promise.all([apiShop(shopId), apiProducts(shopId)]);
  const products = all.filter((p) => p.inStock);
  if (!products.length) throw new ServiceError('OUT_OF_STOCK');
  const customer = await loginCustomer({ name: 'Test Customer', phone: '9876500999' });
  const picks = [...products].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
  return placeOrder({
    customer,
    cart: { shopId, items: picks.map((p) => ({ productId: p.id, qty: 1 + Math.floor(Math.random() * 2) })), instructions: '' },
    address: { name: customer.name, phone: customer.phone, placeId: shop.placeId, street: 'Test order — please ignore', landmark: '' },
    paymentMethod: Math.random() > 0.5 ? 'UPI' : 'COD',
  });
}
