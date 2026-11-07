// Stand-in for the Zevio API for the browser tests, served through Playwright's
// request interception — no server or database needed.
const now = Date.now();
const iso = (minAgo) => new Date(now - minAgo * 60000).toISOString();
const IMG = (seed) => `https://img.zevio.test/${seed}.svg`;
export const places = [
  { id: 'papanasam', name: 'Papanasam' }, { id: 'pandaravadai', name: 'Pandaravadai' }, { id: 'ayyampettai', name: 'Ayyampettai' },
];
export const shops = [
  { id: 's1', shop_name: 'Sri Murugan Hotel', slug: 'sri-murugan', description: 'Tiffin, meals and evening snacks', category: 'hotels', city: 'Papanasam', is_accepting_orders: true, is_active: true, delivery_time: '25-35', cover_image_url: IMG('s1'), contact_phone: '9876543210', open_time: '07:00:00', close_time: '22:00:00' },
  { id: 's2', shop_name: 'Anbu Bakery', slug: 'anbu-bakery', description: 'Fresh puffs, cakes and buns', category: 'bakery', city: 'Pandaravadai', is_accepting_orders: true, is_active: true, delivery_time: '20-30', cover_image_url: IMG('s2'), contact_phone: '9876543211' },
  { id: 's3', shop_name: 'Hotel Saravana Bhavan', slug: 'saravana', description: 'Veg meals', category: 'hotels', city: 'Ayyampettai', is_accepting_orders: false, is_active: true, delivery_time: '30-40', cover_image_url: IMG('s3'), contact_phone: '9876543212' },
  { id: 's4', shop_name: 'Royal Biryani Centre', slug: 'royal-biryani', description: 'Dum biryani and parotta', category: 'hotels', city: 'Papanasam', is_accepting_orders: true, is_active: true, delivery_time: '35-45', cover_image_url: IMG('s4'), contact_phone: '9876543213' },
];
const P = (id, shop, name, price, section, veg, extra = {}) => ({ id, shop_id: shop, name, slug: id, price, section, is_veg: veg, is_available: true, image_url: IMG(id), description: '', min_order_qty: 1, ...extra });
export const products = [
  P('p1', 's1', 'Idli (2 pcs)', 30, 'Tiffin', true, { description: 'Soft rice idli with coconut chutney and sambar.' }),
  P('p2', 's1', 'Ghee Roast Dosa', 70, 'Tiffin', true, { description: 'Crisp dosa roasted in pure ghee.' }),
  P('p3', 's1', 'Chicken 65', 140, 'Starters', false, { description: 'Spicy deep-fried chicken, Chennai style.' }),
  P('p4', 's1', 'Parotta', 15, 'Tiffin', true, { min_order_qty: 4, description: 'Flaky layered parotta. Minimum 4.' }),
  P('p5', 's1', 'Mutton Chukka', 220, 'Starters', false, { is_available: false }),
  P('p6', 's1', 'Filter Coffee', 20, 'Drinks', true),
  P('p7', 's2', 'Veg Puff', 20, 'Puffs', true), P('p8', 's2', 'Egg Puff', 25, 'Puffs', false), P('p9', 's2', 'Black Forest Cake (½ kg)', 380, 'Cakes', true),
  P('p10', 's4', 'Chicken Biryani', 180, 'Biryani', false), P('p11', 's4', 'Veg Biryani', 130, 'Biryani', true),
];
export const customer = { id: 'c1', name: 'Arun Kumar', phone: '9876500001', email: 'arun@example.com', created_at: iso(90000) };
const O = (id, num, shop, status, mins, extra = {}) => ({ id, order_number: num, customer_id: 'c1', shop_id: shop, status, created_at: iso(mins), recipient_name: 'Arun Kumar', recipient_phone: '9876500001', delivery_city: 'Pandaravadai', delivery_address: '12, East Street', landmark: 'Near Pillaiyar temple', subtotal: 0, delivery_fee: 20, payment_method: 'cod', payment_status: 'pending', ...extra });
export const orders = [
  O('o1', 'ZV1042', 's1', 'out_for_delivery', 25, { confirmed_at: iso(22), preparing_at: iso(18), out_for_delivery_at: iso(6), delivery_partner_id: 'd1', subtotal: 200, total_amount: 220 }),
  O('o2', 'ZV1031', 's2', 'delivered', 3000, { confirmed_at: iso(2995), preparing_at: iso(2990), out_for_delivery_at: iso(2980), delivered_at: iso(2960), subtotal: 405, total_amount: 425 }),
  O('o3', 'ZV1020', 's4', 'cancelled', 9000, { cancelled_at: iso(8990), subtotal: 180, total_amount: 200 }),
  O('o4', 'ZV1045', 's4', 'pending', 2, { subtotal: 310, total_amount: 330, customer_id: 'c2', recipient_name: 'Meena' }),
  O('o5', 'ZV1044', 's2', 'preparing', 12, { confirmed_at: iso(10), preparing_at: iso(8), subtotal: 60, total_amount: 80, customer_id: 'c3', recipient_name: 'Karthik' }),
];
const items = {
  o1: [{ order_id: 'o1', product_id: 'p2', product_name: 'Ghee Roast Dosa', unit_price: 70, quantity: 2 }, { order_id: 'o1', product_id: 'p6', product_name: 'Filter Coffee', unit_price: 20, quantity: 3 }],
  o2: [{ order_id: 'o2', product_id: 'p9', product_name: 'Black Forest Cake (½ kg)', unit_price: 380, quantity: 1 }, { order_id: 'o2', product_id: 'p7', product_name: 'Veg Puff', unit_price: 25, quantity: 1 }],
  o3: [{ order_id: 'o3', product_id: 'p10', product_name: 'Chicken Biryani', unit_price: 180, quantity: 1 }],
  o4: [{ order_id: 'o4', product_id: 'p10', product_name: 'Chicken Biryani', unit_price: 180, quantity: 1 }, { order_id: 'o4', product_id: 'p11', product_name: 'Veg Biryani', unit_price: 130, quantity: 1 }],
  o5: [{ order_id: 'o5', product_id: 'p7', product_name: 'Veg Puff', unit_price: 20, quantity: 3 }],
};
const partners = [{ id: 'd1', name: 'Senthil', phone: '9876511111', vehicle: 'TN 49 AB 1234', base_place: 'Papanasam', is_online: true, is_active: true, user_type: 'delivery_person' }];
const settings = { delivery_fee: 20, partner_incentive: 15, support_phone: '9876543000', support_whatsapp: '9876543000', platform_upi_id: 'zevio@upi', platform_upi_name: 'Zevio' };

const hues = { s1: 30, s2: 340, s3: 140, s4: 15 };
function svg(seed) {
  const h = hues[seed] ?? (seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 37) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},55%,62%)"/><stop offset="1" stop-color="hsl(${(h + 30) % 360},50%,42%)"/></linearGradient></defs><rect width="600" height="400" fill="url(#g)"/><circle cx="300" cy="210" r="120" fill="hsl(${h},40%,92%)" opacity=".9"/><circle cx="300" cy="210" r="80" fill="hsl(${(h + 20) % 360},60%,55%)"/></svg>`;
}
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', data }) });
let seq = 1050;
export async function install(ctx, { delay = 150 } = {}) {
  await ctx.route('https://img.zevio.test/**', (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(r.request().url().split('/').pop().replace('.svg', '')) }));
  await ctx.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const p = u.pathname.replace(/^\/api/, '');
    if (delay) await new Promise((r) => setTimeout(r, delay));
    let m;
    if (p === '/settings/') return route.fulfill(ok(settings));
    if (p === '/places/') return route.fulfill(ok(places));
    if (p === '/shops/') return route.fulfill(ok(shops));
    if ((m = p.match(/^\/shop\/(?:slug\/)?([^/]+)$/))) return route.fulfill(ok(shops.find((s) => s.id === m[1] || s.slug === m[1])));
    if ((m = p.match(/^\/products\/by-shop\/([^/]+)/))) return route.fulfill(ok(products.filter((x) => x.shop_id === m[1])));
    if ((m = p.match(/^\/product\/([^/]+)$/))) return route.fulfill(ok(products.find((x) => x.id === m[1])));
    if ((m = p.match(/^\/orders\/by-customer\/([^/]+)/))) return route.fulfill(ok(orders.filter((o) => o.customer_id === m[1])));
    if (p === '/orders/') return route.fulfill(ok(orders));
    if ((m = p.match(/^\/order\/([^/]+)\/items\/$/))) return route.fulfill(ok(items[m[1]] || []));
    if (p === '/order/items/') return route.fulfill(ok((u.searchParams.get('order_ids') || '').split(',').flatMap((id) => items[id] || [])));
    if ((m = p.match(/^\/order\/([^/]+)$/))) return route.fulfill(ok(orders.find((o) => o.id === m[1])));
    if (p === '/order/place/') {
      const f = new URLSearchParams(req.postData() || '');
      const id = 'o' + ++seq;
      const lines = JSON.parse(f.get('items') || '[]');
      orders.unshift(O(id, 'ZV' + seq, f.get('shop_id'), 'pending', 0, { subtotal: Number(f.get('subtotal')) || 0, total_amount: Number(f.get('total_amount')) || 0 }));
      items[id] = lines.map((l) => ({ order_id: id, product_id: l.product_id, product_name: l.product_name || l.name, unit_price: l.unit_price || l.price, quantity: l.quantity || l.qty }));
      return route.fulfill(ok({ order_id: id, order_number: 'ZV' + seq }));
    }
    if ((m = p.match(/^\/user\/([^/]+)$/))) return route.fulfill(ok(m[1] === 'c1' ? customer : partners.find((x) => x.id === m[1]) || customer));
    if (p.startsWith('/users/')) return route.fulfill(ok(u.searchParams.get('user_type') === 'delivery_person' ? partners : [customer, { ...customer, id: 'c2', name: 'Meena' }]));
    if (req.method() === 'POST') return route.fulfill(ok({ id: 'x' + ++seq }));
    console.warn('[mock] unhandled', req.method(), p);
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 'not found' }) });
  });
}
export const sessions = {
  customer: { id: 'c1', customerId: 'c1', role: 'customer', name: 'Arun Kumar', phone: '9876500001', email: 'arun@example.com', picture: null },
  admin: { id: 'a1', role: 'admin', name: 'Waheed', phone: '9999999999', email: 'codekon10@gmail.com' },
};
export const inRange = { status: 'in_range', location: { lat: 10.91333, lng: 79.24194, accuracy: 12, place: 'pandaravadai', source: 'gps' }, acknowledged: true };
