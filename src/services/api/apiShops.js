/** Shops and products from the Zevio API. */
import { apiGet } from './client.js';
import { getPlaces, toProduct, toShop } from './mappers.js';

/* Short caches so one screen does not ask for the same list many times. */
const SHOPS_TTL = 15000;
const PRODUCTS_TTL = 30000;
let shopsCache = { at: 0, list: null, pending: null };
const productsCache = new Map(); // shopId → { at, list }

/** All shops (mapped). `fresh` skips the cache. */
export async function fetchShops(fresh = false) {
  if (!fresh && shopsCache.list && Date.now() - shopsCache.at < SHOPS_TTL) return shopsCache.list;
  if (!fresh && shopsCache.pending) return shopsCache.pending;
  const pending = Promise.all([apiGet('/shops/'), getPlaces()]).then(([rows, places]) => {
    const list = (rows || []).map((r) => toShop(r, places));
    shopsCache = { at: Date.now(), list, pending: null };
    return list;
  });
  shopsCache.pending = pending;
  try {
    return await pending;
  } finally {
    shopsCache.pending = null;
  }
}

const matches = (text, q) => text && text.toLowerCase().includes(q);

export async function getShops(filters = {}) {
  const { category, placeId, query, includeInactive = false } = filters;
  const q = query?.trim().toLowerCase();
  const list = await fetchShops(true);
  return list
    .filter((s) => includeInactive || s.isActive)
    .filter((s) => !category || category === 'all' || s.category === category)
    .filter((s) => !placeId || s.placeId === placeId)
    .filter((s) => !q || matches(s.name, q))
    .sort((a, b) => Number(b.isOpen) - Number(a.isOpen));
}

export async function getShopById(id) {
  const [raw, places] = await Promise.all([apiGet(`/shop/${id}`), getPlaces()]);
  const shop = toShop(raw, places);
  if (shopsCache.list) shopsCache.list = shopsCache.list.map((s) => (s.id === id ? shop : s));
  return shop;
}

export async function searchAll(query) {
  const q = query?.trim().toLowerCase();
  if (!q) return { shops: [], products: [] };
  const shops = (await fetchShops()).filter((s) => s.isActive);
  const lists = await Promise.all(shops.map((s) => getProductsByShop(s.id, { cached: true }).catch(() => [])));
  const shopById = Object.fromEntries(shops.map((s) => [s.id, s]));
  return {
    shops: shops.filter((s) => matches(s.name, q)).sort((a, b) => Number(b.isOpen) - Number(a.isOpen)),
    products: lists
      .flat()
      .filter((p) => matches(p.name, q))
      .slice(0, 30)
      .map((p) => ({ ...p, shopName: shopById[p.shopId].name, shopIsOpen: shopById[p.shopId].isOpen })),
  };
}

/* ---------------- products ---------------- */

export async function getProductsByShop(shopId, { cached = false } = {}) {
  const hit = productsCache.get(shopId);
  if (cached && hit && Date.now() - hit.at < PRODUCTS_TTL) return hit.list;
  const rows = await apiGet(`/products/by-shop/${shopId}`);
  const list = (rows || []).map(toProduct).sort((a, b) => a.name.localeCompare(b.name));
  productsCache.set(shopId, { at: Date.now(), list });
  return list;
}

