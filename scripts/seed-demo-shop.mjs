/**
 * Add a demo shop with a small menu to the live database, for testing.
 *
 *   npm run seed:demo            add "Mynt Demo Shop (test)" (safe to run twice)
 *   npm run seed:demo -- --hide  hide it from customers again
 *
 * Uses ZEVIO_API_URL and ZEVIO_API_KEY from .env.local. Also adds the five
 * delivery villages if Admin → Settings has none, because a shop must sit in
 * one of them.
 */
import { randomUUID } from 'node:crypto';
import { get, must, post } from './lib-api.mjs';
import { SERVICE_AREAS } from '../src/data/serviceAreas.js';

const SLUG = 'mynt-demo-shop';
const VILLAGE = 'pandaravadai';

const MENU = [
  { name: 'Idli (2 pcs)', price: 30, section: 'Tiffin', is_veg: true, description: 'Soft rice idli with coconut chutney and sambar.' },
  { name: 'Ghee Roast Dosa', price: 70, section: 'Tiffin', is_veg: true, description: 'Crisp dosa roasted in ghee.' },
  { name: 'Parotta', price: 15, section: 'Tiffin', is_veg: true, min_order_qty: 4, description: 'Flaky layered parotta. Minimum 4.' },
  { name: 'Chicken 65', price: 140, section: 'Starters', is_veg: false, description: 'Spicy fried chicken.' },
  { name: 'Filter Coffee', price: 20, section: 'Drinks', is_veg: true, description: 'Strong, frothy, with milk.' },
];

const hide = process.argv.includes('--hide');

const existing = await get(`/shop/slug/${SLUG}`);
const shop = existing.ok ? existing.data : null;

if (hide) {
  if (!shop?.id) {
    console.log('No demo shop found — nothing to hide.');
    process.exit(0);
  }
  must(await post('/shop/set-active/', { shop_id: shop.id, status: false }), 'Hiding the demo shop');
  console.log('✓ Demo shop hidden from customers. Show it again from Admin → Shops, or run npm run seed:demo.');
  process.exit(0);
}

// 1. Delivery villages
const places = must(await get('/places/'), 'Reading delivery villages') || [];
const have = new Set(places.map((p) => p.id));
for (const area of SERVICE_AREAS) {
  if (have.has(area.id)) continue;
  must(await post('/place/add/', { id: area.id, name: area.name }), `Adding village ${area.name}`);
  console.log(`✓ Village added: ${area.name}`);
}
const villageName = SERVICE_AREAS.find((a) => a.id === VILLAGE).name;

// 2. The shop (and the owner profile a shop belongs to)
let shopId = shop?.id;
if (shopId) {
  console.log(`• Demo shop already exists (${shopId}) — making sure it is visible and open.`);
  must(await post('/shop/set-active/', { shop_id: shopId, status: true }), 'Showing the demo shop');
} else {
  const ownerId = randomUUID();
  must(await post('/user/add/', { uid: ownerId, name: 'Mynt Demo Owner', phone: '9000000001', user_type: 'shop' }), 'Creating the demo shop owner');
  const created = must(
    await post('/shop/add/', {
      profile_id: ownerId,
      slug: SLUG,
      shop_name: 'Mynt Demo Shop (test)',
      description: 'A test shop for trying the app. Orders here are not real.',
      contact_phone: '9000000001',
      address: 'East Street',
      city: villageName,
      category: 'hotels',
      delivery_time: '20-30',
      open_time: '00:00:00',
      close_time: '23:59:00',
      is_active: true,
    }),
    'Creating the demo shop',
  );
  shopId = created?.id || must(await get(`/shop/slug/${SLUG}`), 'Finding the new shop')?.id;
  console.log(`✓ Shop created: Mynt Demo Shop (test) in ${villageName}`);
}
must(await post('/shop/toggle-orders/', { shop_id: shopId, status: true }), 'Opening the demo shop for orders');

// 3. The menu (only items not already there)
const current = must(await get(`/products/by-shop/${shopId}`), 'Reading the menu') || [];
const names = new Set(current.map((p) => p.name));
for (const item of MENU) {
  if (names.has(item.name)) continue;
  const slug = `${SLUG}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  must(await post('/product/add/', { shop_id: shopId, slug, is_available: true, ...item }), `Adding ${item.name}`);
  console.log(`✓ Item added: ${item.name} — ₹${item.price}`);
}

console.log('\nDone. Open the app, and "Mynt Demo Shop (test)" is on Home.');
console.log('Hide it later with:  npm run seed:demo -- --hide');
