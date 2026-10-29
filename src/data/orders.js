/**
 * Mock orders, built relative to "now" so today's dashboards always have data.
 * 15 orders across all statuses.
 */
import { products } from './products.js';
import { shops } from './shops.js';
import { customers } from './users.js';
import { settings } from './settings.js';

const MIN = 60000;
const DAY = 86400000;
const STEP_OFFSETS = { PENDING: 0, CONFIRMED: 3, PREPARING: 15, OUT_FOR_DELIVERY: 22, DELIVERED: 38 };
const FLOW = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

function makeOrder({ number, customerId, shopId, items, status, minutesAgo = 0, daysAgo = 0, payment, partnerId = null, rejectReason = null }) {
  const now = Date.now();
  const placedAt = now - daysAgo * DAY - (daysAgo ? 2 * 60 * MIN : 0) - minutesAgo * MIN;
  const shop = shops.find((s) => s.id === shopId);
  const customer = customers.find((c) => c.id === customerId);
  const address = customer.addresses[0];

  const lines = items.map(([productId, qty]) => {
    const prod = products.find((x) => x.id === productId);
    return { productId, name: prod.name, price: prod.price, qty, isVeg: prod.isVeg };
  });
  const itemTotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

  const at = (offsetMin) => new Date(Math.min(placedAt + offsetMin * MIN, now - 30000)).toISOString();
  let statusHistory;
  if (status === 'CANCELLED') {
    statusHistory = [
      { status: 'PENDING', at: at(0) },
      { status, at: at(rejectReason ? 2 : 1) },
    ];
  } else {
    const upto = FLOW.indexOf(status);
    statusHistory = FLOW.slice(0, upto + 1).map((st) => ({ status: st, at: at(STEP_OFFSETS[st]) }));
  }

  return {
    id: `o${number}`,
    number,
    customerId,
    customerName: customer.name,
    customerPhone: customer.phone,
    shopId,
    shopName: shop.name,
    shopPhone: shop.phone,
    shopPlaceId: shop.placeId,
    items: lines,
    itemTotal,
    deliveryFee: settings.deliveryFee,
    total: itemTotal + settings.deliveryFee,
    paymentMethod: payment,
    paymentStatus: payment === 'UPI' || status === 'DELIVERED' ? 'PAID' : 'PENDING',
    address: { ...address },
    instructions: '',
    status,
    statusHistory,
    partnerId,
    rejectReason,
    createdAt: new Date(placedAt).toISOString(),
  };
}

export function buildOrders() {
  return [
    makeOrder({ number: 1001, customerId: 'c1', shopId: 's1', items: [['p1', 2], ['p5', 2], ['p8', 2]], status: 'DELIVERED', daysAgo: 5, payment: 'UPI', partnerId: 'd1' }),
    makeOrder({ number: 1002, customerId: 'c2', shopId: 's2', items: [['p9', 2], ['p13', 2]], status: 'DELIVERED', daysAgo: 4, payment: 'COD', partnerId: 'd2' }),
    makeOrder({ number: 1003, customerId: 'c3', shopId: 's4', items: [['p26', 1]], status: 'DELIVERED', daysAgo: 2, payment: 'UPI', partnerId: 'd1' }),
    makeOrder({ number: 1004, customerId: 'c4', shopId: 's6', items: [['p36', 1], ['p37', 1], ['p41', 2]], status: 'DELIVERED', daysAgo: 1, payment: 'COD', partnerId: 'd3' }),
    makeOrder({ number: 1005, customerId: 'c5', shopId: 's7', items: [['p42', 2], ['p46', 1]], status: 'DELIVERED', minutesAgo: 300, payment: 'COD', partnerId: 'd1' }),
    makeOrder({ number: 1006, customerId: 'c1', shopId: 's8', items: [['p48', 1], ['p52', 2]], status: 'DELIVERED', minutesAgo: 240, payment: 'UPI', partnerId: 'd1' }),
    makeOrder({ number: 1007, customerId: 'c2', shopId: 's9', items: [['p54', 4], ['p56', 1]], status: 'DELIVERED', minutesAgo: 180, payment: 'COD', partnerId: 'd2' }),
    makeOrder({ number: 1008, customerId: 'c3', shopId: 's2', items: [['p10', 1]], status: 'CANCELLED', minutesAgo: 150, payment: 'COD', rejectReason: 'shopBusy' }),
    makeOrder({ number: 1009, customerId: 'c4', shopId: 's4', items: [['p22', 4]], status: 'CANCELLED', minutesAgo: 120, payment: 'COD' }),
    makeOrder({ number: 1010, customerId: 'c5', shopId: 's1', items: [['p2', 1], ['p8', 1]], status: 'OUT_FOR_DELIVERY', minutesAgo: 40, payment: 'COD', partnerId: 'd1' }),
    makeOrder({ number: 1011, customerId: 'c1', shopId: 's5', items: [['p30', 4], ['p34', 1]], status: 'OUT_FOR_DELIVERY', minutesAgo: 35, payment: 'UPI', partnerId: 'd2' }),
    makeOrder({ number: 1012, customerId: 'c2', shopId: 's2', items: [['p9', 1], ['p15', 1]], status: 'PREPARING', minutesAgo: 25, payment: 'COD', partnerId: 'd2' }),
    makeOrder({ number: 1013, customerId: 'c3', shopId: 's7', items: [['p42', 3], ['p47', 1]], status: 'CONFIRMED', minutesAgo: 15, payment: 'UPI' }),
    makeOrder({ number: 1014, customerId: 'c1', shopId: 's1', items: [['p7', 2]], status: 'CONFIRMED', minutesAgo: 10, payment: 'UPI' }),
    makeOrder({ number: 1015, customerId: 'c4', shopId: 's1', items: [['p1', 2], ['p3', 1]], status: 'PENDING', minutesAgo: 3, payment: 'COD' }),
  ];
}
