/** Products of a shop — all from the Zevio API. */
export { getProductsByShop, getProductById, saveProduct, deleteProduct } from './api/apiShops.js';
import { saveProduct } from './api/apiShops.js';

/** The quick in-stock switch in the shop panel. */
export function setProductStock(id, inStock) {
  return saveProduct({ id, inStock });
}
