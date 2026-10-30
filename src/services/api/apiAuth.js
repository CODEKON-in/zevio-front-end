/**
 * Admin login, plus the quick logins used by the DEV role switcher and DEV
 * "simulate order" (API mode). Customers and shop owners sign in with
 * Google — see apiAccount.js.
 */
import { apiGet, apiPost } from './client.js';
import { newUuid } from './config.js';
import { fetchShops, getShopById } from './apiShops.js';
import { loadDb } from '../request.js';
import { ServiceError } from '../../utils/mock.js';
import { ROLES } from '../../utils/constants.js';
import { cleanPhone } from '../../utils/format.js';

async function profileExists(uid) {
  try {
    await apiGet(`/user/${uid}`);
    return true;
  } catch (e) {
    // The API answers 404 — or 500 for a missing profile (BACKEND-CHANGES.md) — when it does not exist.
    if (e.code === 'NOT_FOUND' || e.code === 'SERVER') return false;
    throw e;
  }
}

export async function loginCustomer(details) {
  const phone = cleanPhone(details.phone);
  const name = (details.name || '').trim();
  if (!phone || !name) throw new ServiceError('LOGIN_DETAILS');

  const mod = await loadDb();
  const db = mod.getDb();
  let customer = db.customers.find((c) => c.phone === phone && c.apiProfile);

  if (customer && !(await profileExists(customer.id))) customer = null;

  if (!customer) {
    const id = newUuid();
    await apiPost('/user/add/', { uid: id, name, phone, user_type: 'customer' });
    db.customers = db.customers.filter((c) => !(c.phone === phone && c.apiProfile));
    customer = { id, name, phone, isBlocked: false, addresses: [], apiProfile: true, createdAt: new Date().toISOString() };
    db.customers.push(customer);
    mod.commit();
  } else if (name !== customer.name) {
    await apiPost('/user/update/', { uid: customer.id, attr: 'name', attr_value: name }).catch(() => {});
    customer.name = name;
    mod.commit();
  }
  if (customer.isBlocked) throw new ServiceError('BLOCKED');
  return { id: customer.id, customerId: customer.id, name: customer.name, phone: customer.phone, role: ROLES.CUSTOMER };
}

export async function loginShop(details) {
  let shopId = details.shopId;
  if (!shopId) shopId = (await fetchShops(true))[0]?.id;
  if (!shopId) throw new ServiceError('NOT_FOUND');
  const shop = await getShopById(shopId);
  return {
    id: shop.profileId || `u_${shop.id}`,
    shopId: shop.id,
    name: shop.ownerName || shop.name,
    phone: shop.phone,
    role: ROLES.SHOP,
  };
}

/**
 * Admin login. The admin is a profile with user_type = 'admin'; the API checks
 * the password against the stored hash and answers 401 if it does not match.
 */
export async function loginAdmin(details = {}) {
  const email = (details.email || '').trim().toLowerCase();
  const password = details.password || '';
  if (!email || !password) throw new ServiceError('ADMIN_CREDENTIALS');
  let profile;
  try {
    profile = await apiPost('/auth/admin', { email, password });
  } catch (e) {
    // 401 here means "wrong email or password", not a misconfigured API key.
    if (e.code === 'API_AUTH') throw new ServiceError('ADMIN_CREDENTIALS');
    throw e;
  }
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    role: ROLES.ADMIN,
  };
}
