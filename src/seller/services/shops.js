import { apiRequest, poll, refreshAll } from './api';

const SHOP_POLL_MS = 20000;

// The API stores two categories; the panel offers a longer list of labels.
const CATEGORY_LABEL = { hotels: 'Restaurant & Cafe', bakery: 'Bakery & Sweets' };

const toHourMinute = (value, fallback) =>
  typeof value === 'string' && value.length >= 5 ? value.slice(0, 5) : fallback;

function toShop(raw) {
  const open = toHourMinute(raw.open_time, '08:00');
  const close = toHourMinute(raw.close_time, '22:00');
  return {
    id: raw.id,
    name: raw.shop_name || '',
    category: CATEGORY_LABEL[raw.category] || raw.category || '',
    phone: raw.contact_phone || '',
    area: raw.city || '',
    upiId: raw.upi_id || '',
    openingTime: open,
    closingTime: close,
    timings: { open, close },
    photoUrl: raw.logo_url || '',
    isOpen: Boolean(raw.is_accepting_orders),
  };
}

/** Fetch the signed-in seller's shop */
export async function getShop(shopId) {
  if (!shopId) return null;
  return toShop(await apiRequest('/shop'));
}

/** Live-ish subscription to the shop (refreshed periodically) */
export function subscribeToShop(shopId, callback) {
  if (!shopId) {
    callback({ shop: null, loading: false, error: 'Shop ID not available' });
    return () => {};
  }
  return poll(
    async () => toShop(await apiRequest('/shop')),
    (shop) => callback({ shop, loading: false, error: null }),
    (err) => callback({ shop: null, loading: false, error: err.message }),
    SHOP_POLL_MS
  );
}

/** Update shop Open/Closed status */
export async function updateShopStatus(shopId, isOpen) {
  if (!shopId) throw new Error('Shop ID missing');
  await apiRequest('/shop/toggle-open/', { method: 'POST', form: { status: Boolean(isOpen) } });
  refreshAll();
}

/** Update comprehensive shop profile details */
export async function updateShopDetails(shopId, shopData) {
  if (!shopId) throw new Error('Shop ID missing');
  await apiRequest('/shop/update/', {
    method: 'POST',
    form: {
      shop_name: (shopData.name || '').trim(),
      category: (shopData.category || '').trim(),
      contact_phone: (shopData.phone || '').trim(),
      city: (shopData.area || '').trim(),
      upi_id: (shopData.upiId || '').trim(),
      open_time: shopData.openingTime || '08:00',
      close_time: shopData.closingTime || '22:00',
      logo_url: shopData.photoUrl || '',
    },
  });
  refreshAll();
}
