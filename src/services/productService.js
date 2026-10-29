import { request } from './request.js';
import { isApiId } from './api/config.js';
import * as api from './api/apiShops.js';
import { ServiceError, makeId } from '../utils/mock.js';

/** All products of a shop (in-stock and out-of-stock). */
export function getProductsByShop(shopId) {
  if (isApiId(shopId)) return api.getProductsByShop(shopId);
  return request(({ getDb, commit }) => getDb().products.filter((p) => p.shopId === shopId));
}

export function getProductById(id) {
  if (isApiId(id)) return api.getProductById(id);
  return request(({ getDb, commit }) => {
    const product = getDb().products.find((p) => p.id === id);
    if (!product) throw new ServiceError('NOT_FOUND');
    return product;
  });
}

/** Create (no id) or update a product. */
export function saveProduct(product) {
  if (isApiId(product.id) || (!product.id && isApiId(product.shopId))) return api.saveProduct(product);
  return request(({ getDb, commit }) => {
    const db = getDb();
    if (!product.id) {
      const created = { inStock: true, image: null, isVeg: null, ...product, id: makeId('p') };
      db.products.push(created);
      commit();
      return created;
    }
    const idx = db.products.findIndex((p) => p.id === product.id);
    if (idx === -1) throw new ServiceError('NOT_FOUND');
    db.products[idx] = { ...db.products[idx], ...product };
    commit();
    return db.products[idx];
  });
}

export function setProductStock(id, inStock) {
  return saveProduct({ id, inStock });
}

export function deleteProduct(id) {
  if (isApiId(id)) return api.deleteProduct(id);
  return request(({ getDb, commit }) => {
    const db = getDb();
    db.products = db.products.filter((p) => p.id !== id);
    commit();
    return true;
  });
}
