/** Shops and products from the Zevio API. */
import { apiGet, apiPost } from './client.js';
import { newUuid } from './config.js';
import { cityFromPlaceId, encodeMeta, decodeMeta, getPlaces, makeSlug, productMeta, shopMeta, toProduct, toShop } from './mappers.js';
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

const isWebUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v) && v.length <= 500;

/** Create (no id) or update a shop. Only changed fields are sent. */
export async function saveShop(shop) {
  const places = await getPlaces();
  if (!shop.id) return createShop(shop, places);

  const [raw] = await Promise.all([apiGet(`/shop/${shop.id}`)]);
  const current = toShop(raw, places);
  const next = { ...current, ...shop };
  const { text } = decodeMeta(raw.description);

  const wanted = {
    shop_name: next.name,
    contact_phone: next.phone,
    contact_email: next.email || raw.contact_email,
    address: next.address,
    city: cityFromPlaceId(next.placeId, places) || raw.city,
    description: encodeMeta(next.description ?? text, shopMeta(next)),
  };
  if (isWebUrl(next.image)) wanted.cover_image_url = next.image;

  for (const [attr, value] of Object.entries(wanted)) {
    if (value === undefined || value === null || value === '') continue;
    if ((raw[attr] ?? '') === value) continue;
    await apiPost('/shop/update/', { shop_id: shop.id, attr, attr_value: value });
  }
  if (typeof shop.isOpen === 'boolean' && shop.isOpen !== Boolean(raw.is_accepting_orders)) {
    await apiPost('/shop/toggle-orders/', { shop_id: shop.id, status: shop.isOpen });
  }
  forgetShops();
  return getShopById(shop.id);
}

async function createShop(shop, places) {
  if (!shop.email) throw new ServiceError('EMAIL_REQUIRED');
  // A shop belongs to an owner profile, so create that first (sign-up passes its own).
  const profileId = shop.profileId || newUuid();
  if (!shop.profileId) await apiPost('/user/add/', { uid: profileId, name: shop.ownerName || shop.name, phone: shop.phone, user_type: 'shop' });
  const slug = makeSlug(shop.name);
  const created = await apiPost('/shop/add/', {
    profile_id: profileId,
    shop_name: shop.name,
    slug,
    description: encodeMeta(shop.description || '', shopMeta({ isActive: true, deliveryTime: '30-40', ...shop })),
    contact_phone: shop.phone,
    contact_email: shop.email,
    address: shop.address,
    city: cityFromPlaceId(shop.placeId, places),
    ...(isWebUrl(shop.image) ? { cover_image_url: shop.image } : {}),
  });
  forgetShops();
  // The API does not return the new id yet; find the shop by its slug.
  const raw = created?.id ? await apiGet(`/shop/${created.id}`) : await apiGet(`/shop/slug/${slug}`);
  return toShop(raw, places);
}

export function setShopOpen(id, isOpen) {
  return apiPost('/shop/toggle-orders/', { shop_id: id, status: isOpen }).then(() => {
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
      name: product.name,
      slug,
      price: product.price,
      description: encodeMeta(product.description || '', productMeta(product)),
      is_available: product.inStock !== false,
      ...(isWebUrl(product.image) ? { image_url: product.image } : {}),
    });
    productsCache.delete(product.shopId);
    const raw = created?.id ? await apiGet(`/product/${created.id}`) : await apiGet(`/product/slug/${slug}`);
    return toProduct(raw);
  }

  const raw = await apiGet(`/product/${product.id}`);
  const current = toProduct(raw);
  const next = { ...current, ...product };
  const wanted = {
    name: next.name,
    price: next.price,
    description: encodeMeta(next.description ?? current.description, productMeta(next)),
  };
  if (isWebUrl(next.image)) wanted.image_url = next.image;
  for (const [attr, value] of Object.entries(wanted)) {
    if (value === undefined || value === null || value === '') continue;
    const same = attr === 'price' ? Number(raw.price) === Number(value) : (raw[attr] ?? '') === value;
    if (same) continue;
    await apiPost('/product/update/', { product_id: product.id, attr, attr_value: value });
  }
  if (typeof product.inStock === 'boolean' && product.inStock !== (raw.is_available !== false)) {
    await apiPost('/product/toggle-availability/', { product_id: product.id, status: product.inStock });
  }
  productsCache.delete(current.shopId);
  return getProductById(product.id);
}

export async function deleteProduct(id) {
  await apiPost('/product/delete/', { product_id: id });
  productsCache.clear();
  return true;
}
