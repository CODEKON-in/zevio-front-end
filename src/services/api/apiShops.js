/** Shops and products from the Zevio API. */
import { apiGet, apiPost } from './client.js';
import { newUuid } from './config.js';
import { getPlaces, makeSlug, productColumns, shopColumns, toProduct, toShop } from './mappers.js';
import { ServiceError } from '../../utils/mock.js';

/* Short caches so one screen does not ask for the same list many times. */
const SHOPS_TTL = 15000;
const PRODUCTS_TTL = 30000;
let shopsCache = { at: 0, list: null, pending: null };
const productsCache = new Map(); // shopId → { at, list }

export function forgetShops() {
  shopsCache = { at: 0, list: null, pending: null };
}

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

/** Create (no id) or update a shop. The API takes every column in one call. */
export async function saveShop(shop) {
  const places = await getPlaces();
  if (!shop.id) return createShop(shop, places);

  const columns = shopColumns(shop, places);
  if (Object.keys(columns).length) await apiPost('/shop/update/', { shop_id: shop.id, ...columns });
  if (typeof shop.isOpen === 'boolean') {
    await apiPost('/shop/toggle-orders/', { shop_id: shop.id, status: shop.isOpen });
  }
  forgetShops();
  return getShopById(shop.id);
}

async function createShop(shop, places) {
  if (!shop.email) throw new ServiceError('EMAIL_REQUIRED');
  // A shop belongs to an owner profile, so create that first (sign-up passes its own).
  const profileId = shop.profileId || newUuid();
  if (!shop.profileId) {
    await apiPost('/user/add/', { uid: profileId, name: shop.ownerName || shop.name, phone: shop.phone, user_type: 'shop' });
  }
  const slug = makeSlug(shop.name);
  const created = await apiPost('/shop/add/', {
    profile_id: profileId,
    slug,
    ...shopColumns({ deliveryTime: '30-40', isActive: true, ...shop }, places),
  });
  forgetShops();
  // The API returns the new id; fall back to the slug for an older deployment.
  const raw = created?.id ? await apiGet(`/shop/${created.id}`) : await apiGet(`/shop/slug/${slug}`);
  return toShop(raw, places);
}

export function setShopOpen(id, isOpen) {
  return apiPost('/shop/toggle-orders/', { shop_id: id, status: isOpen }).then(() => {
    forgetShops();
    return getShopById(id);
  });
}

/** Admin activate / deactivate — hides the shop from customers entirely. */
export function setShopActive(id, isActive) {
  return apiPost('/shop/set-active/', { shop_id: id, status: isActive }).then(() => {
    forgetShops();
    return getShopById(id);
  });
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

export async function getProductById(id) {
  return toProduct(await apiGet(`/product/${id}`));
}

export async function saveProduct(product) {
  if (!product.id) {
    const slug = makeSlug(product.name);
    const created = await apiPost('/product/add/', {
      shop_id: product.shopId,
      slug,
      price: product.price,
      ...productColumns(product),
    });
    productsCache.delete(product.shopId);
    const raw = created?.id ? await apiGet(`/product/${created.id}`) : await apiGet(`/product/slug/${slug}`);
    return toProduct(raw);
  }

  const columns = productColumns(product);
  if (Object.keys(columns).length) await apiPost('/product/update/', { product_id: product.id, ...columns });
  productsCache.clear();
  return getProductById(product.id);
}

export async function deleteProduct(id) {
  await apiPost('/product/delete/', { product_id: id });
  productsCache.clear();
  return true;
}
