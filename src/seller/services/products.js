import { apiRequest, poll, refreshAll } from './api';

const PRODUCTS_POLL_MS = 30000;

function toProduct(raw) {
  return {
    id: raw.id,
    shopId: raw.shop_id,
    name: raw.name || '',
    description: raw.description || '',
    price: Number(raw.price) || 0,
    category: raw.section || 'General',
    isVeg: typeof raw.is_veg === 'boolean' ? raw.is_veg : false,
    // The API has no minimum-quantity column yet, so every item reads as 1.
    minOrderQty: 1,
    inStock: raw.is_available !== false,
    imageUrl: raw.image_url || '',
  };
}

function toForm(data) {
  return {
    name: (data.name || '').trim(),
    description: (data.description || '').trim().slice(0, 200),
    price: Number(data.price),
    section: (data.category || 'General').trim(),
    is_veg: Boolean(data.isVeg),
    is_available: data.inStock !== false,
    image_url: data.imageUrl || '',
  };
}

/** Products of the signed-in seller's shop, sorted by name, refreshed periodically */
export function subscribeToShopProducts(shopId, callback) {
  if (!shopId) {
    callback({ products: [], loading: false, error: 'Shop ID not available' });
    return () => {};
  }
  return poll(
    async () => (await apiRequest('/products')).map(toProduct).sort((a, b) => a.name.localeCompare(b.name)),
    (products) => callback({ products, loading: false, error: null }),
    (err) => callback({ products: [], loading: false, error: err.message }),
    PRODUCTS_POLL_MS
  );
}

/** Create a new product for the shop */
export async function createProduct(shopId, productData) {
  if (!shopId) throw new Error('Shop ID missing');
  const created = await apiRequest('/product/add/', { method: 'POST', form: toForm(productData) });
  refreshAll();
  return created.id;
}

/** Update an existing product */
export async function updateProduct(productId, shopId, productData) {
  if (!productId) throw new Error('Product ID is required');
  await apiRequest('/product/update/', { method: 'POST', form: { product_id: productId, ...toForm(productData) } });
  refreshAll();
}

/** Instant in-stock quick toggle directly from the list row */
export async function toggleProductStock(productId, inStock) {
  if (!productId) throw new Error('Product ID is required');
  await apiRequest('/product/toggle-stock/', { method: 'POST', form: { product_id: productId, in_stock: Boolean(inStock) } });
  refreshAll();
}

/** Delete a product */
export async function deleteProduct(productId) {
  if (!productId) throw new Error('Product ID is required');
  await apiRequest('/product/delete/', { method: 'POST', form: { product_id: productId } });
  refreshAll();
}
