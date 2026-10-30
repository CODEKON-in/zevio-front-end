import { request } from './request.js';
import { USE_API, isApiId } from './api/config.js';
import * as api from './api/apiShops.js';
import { ServiceError, makeId } from '../utils/mock.js';

const matches = (text, q) => text && text.toLowerCase().includes(q);

/**
 * List shops. Open shops first, closed shops at the bottom.
 * @param {{category?:string, placeId?:string, query?:string, includeInactive?:boolean}} [filters]
 */
export function getShops(filters = {}) {
  if (USE_API) return api.getShops(filters);
  return request(({ getDb, commit }) => {
    const { category, placeId, query, includeInactive = false } = filters;
    const q = query?.trim().toLowerCase();
    return getDb()
      .shops.filter((s) => !s.deleted && (includeInactive || s.isActive))
      .filter((s) => !category || category === 'all' || s.category === category)
      .filter((s) => !placeId || s.placeId === placeId)
      .filter((s) => !q || matches(s.name, q))
      .sort((a, b) => Number(b.isOpen) - Number(a.isOpen));
  });
}

export function getShopById(id) {
  if (isApiId(id)) return api.getShopById(id);
  return request(({ getDb, commit }) => {
    const shop = getDb().shops.find((s) => s.id === id);
    if (!shop) throw new ServiceError('NOT_FOUND');
    return shop;
  });
}

/**
 * Search shops and products together (customer search bar).
 * @returns {Promise<{shops:Array, products:Array}>} products include shopName/shopIsOpen
 */
export function searchAll(query) {
  if (USE_API) return api.searchAll(query);
  return request(({ getDb, commit }) => {
    const q = query?.trim().toLowerCase();
    if (!q) return { shops: [], products: [] };
    const db = getDb();
    const activeShops = db.shops.filter((s) => s.isActive);
    const shopById = Object.fromEntries(activeShops.map((s) => [s.id, s]));
    return {
      shops: activeShops.filter((s) => matches(s.name, q)).sort((a, b) => Number(b.isOpen) - Number(a.isOpen)),
      products: db.products
        .filter((p) => shopById[p.shopId] && (matches(p.name, q)))
        .slice(0, 30)
        .map((p) => ({ ...p, shopName: shopById[p.shopId].name, shopIsOpen: shopById[p.shopId].isOpen })),
    };
  });
}

/** Create (no id) or update a shop. */
export function saveShop(shop) {
  if (USE_API && (!shop.id || isApiId(shop.id))) return api.saveShop(shop);
  return request(({ getDb, commit }) => {
    const db = getDb();
    if (!shop.id) {
      const created = { isOpen: false, isActive: true, deliveryTime: '30-40', image: null, ...shop, id: makeId('s') };
      db.shops.push(created);
      commit();
      return created;
    }
    const idx = db.shops.findIndex((s) => s.id === shop.id);
    if (idx === -1) throw new ServiceError('NOT_FOUND');
    db.shops[idx] = { ...db.shops[idx], ...shop };
    commit();
    return db.shops[idx];
  });
}

/** Shop owner's big Open/Closed toggle. */
export function setShopOpen(id, isOpen) {
  if (isApiId(id)) return api.setShopOpen(id, isOpen);
  return saveShop({ id, isOpen });
}

/** Admin activate / deactivate. */
export function setShopActive(id, isActive) {
  if (isApiId(id)) return api.setShopActive(id, isActive);
  return saveShop({ id, isActive });
}
