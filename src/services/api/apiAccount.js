/**
 * Google sign-in / sign-up / delete account against the Zevio API.
 *
 * The ID token Google hands the browser is sent to POST /api/auth/google, which
 * checks its signature, issuer and audience against Google's public keys. Only
 * what comes back from there is trusted — the browser's own decode of the token
 * is used for filling in the sign-up form, never to decide who someone is.
 *
 * The verified profile is found by its google_sub column. Accounts created
 * before Google sign-in are matched on email and linked on first sign-in.
 * Shops are found with /api/shops/by-profile/<id>, or by the shop's contact
 * email (for shops the admin created).
 */
import { apiGet, apiPost } from './client.js';
import { fetchShops, forgetShops, saveShop } from './apiShops.js';
import { getOrders } from './apiOrders.js';
import { getPlaces, toShop } from './mappers.js';
import { newUuid } from './config.js';
import { loadDb } from '../request.js';
import { ServiceError } from '../../utils/mock.js';
import { ACTIVE_STATUSES, ROLES, SUBSCRIPTION_STATUS } from '../../utils/constants.js';
import { cleanPhone } from '../../utils/format.js';

/**
 * Verifies the Google ID token with the API.
 * @returns {{google:{sub,email,name,picture}, profile:object|null}}
 */
async function verifyGoogle(google) {
  if (!google?.credential) throw new ServiceError('GOOGLE_FAILED');
  try {
    return await apiPost('/auth/google', { credential: google.credential });
  } catch (e) {
    // 401/403 from this endpoint means the token did not check out, or the
    // account is blocked — not that our own API key is wrong.
    if (e.code === 'API_AUTH') throw new ServiceError('GOOGLE_REJECTED');
    throw e;
  }
}

async function getProfile(uid) {
  try {
    return await apiGet(`/user/${uid}`);
  } catch (e) {
    // Missing profiles come back as 404 (or 500 until the API bug is fixed).
    if (e.code === 'NOT_FOUND' || e.code === 'SERVER') return null;
    throw e;
  }
}

/** Customer extras the API cannot store (addresses, blocked) live on this phone. */
async function localCustomer(profile, google) {
  const mod = await loadDb();
  const db = mod.getDb();
  let c = db.customers.find((x) => x.id === profile.id);
  if (!c) {
    c = { id: profile.id, addresses: [], isBlocked: false, apiProfile: true, createdAt: profile.created_at || new Date().toISOString() };
    db.customers.push(c);
  }
  Object.assign(c, { name: profile.name, phone: profile.phone, email: google.email, googleId: google.sub });
  mod.commit();
  return c;
}

const customerUser = (c, g) => ({ id: c.id, customerId: c.id, role: ROLES.CUSTOMER, name: c.name, phone: c.phone, email: g.email, picture: g.picture || null });
const shopUser = (s, g) => ({ id: s.profileId || `u_${s.id}`, shopId: s.id, role: ROLES.SHOP, name: s.ownerName || s.name, phone: s.phone, email: g.email, picture: g.picture || null });

async function findShop(uid, google) {
  const [rows, places] = await Promise.all([apiGet(`/shops/by-profile/${uid}`), getPlaces()]);
  if (rows?.length) return toShop(rows[0], places);
  const all = await fetchShops(true);
  return all.find((s) => s.email && s.email.toLowerCase() === google.email) || null;
}

export async function signIn(role, googleFromBrowser) {
  const { google, profile } = await verifyGoogle(googleFromBrowser);

  if (role === ROLES.CUSTOMER) {
    if (!profile) return { needsSignUp: true, google };
    if (profile.user_type !== 'customer') throw new ServiceError('WRONG_ROLE');
    // is_blocked is a real column, so the admin's block applies on every phone.
    if (profile.is_blocked) throw new ServiceError('BLOCKED');
    const c = await localCustomer(profile, google);
    return { user: customerUser(c, google) };
  }

  if (role === ROLES.SHOP) {
    const shop = profile ? await findShop(profile.id, google) : null;
    return shop ? { user: shopUser(shop, google) } : { needsSignUp: true, google };
  }

  throw new ServiceError('NOT_FOUND');
}

/**
 * The profile for a verified Google account, creating it the first time.
 * google_sub is stored so the next sign-in finds this row directly.
 */
async function ensureProfile(google, name, phone, userType) {
  const { profile } = await verifyGoogle(google);
  if (profile) return profile;
  const uid = newUuid();
  await apiPost('/user/add/', {
    uid,
    name,
    phone,
    user_type: userType,
    email: google.email,
    google_sub: google.sub,
  });
  return { id: uid, name, phone, user_type: userType };
}

export async function signUp(role, google, details) {
  const phone = cleanPhone(details.phone);
  if (role === ROLES.CUSTOMER) {
    const profile = await ensureProfile(google, details.name.trim(), phone, 'customer');
    const c = await localCustomer({ ...profile, name: details.name.trim(), phone }, google);
    return customerUser(c, google);
  }
  if (role === ROLES.SHOP) {
    const owner = await ensureProfile(google, details.ownerName.trim(), phone, 'shop');
    const today = new Date().toISOString().slice(0, 10);
    const shop = await saveShop({
      profileId: owner.id,
      name: details.shopName.trim(),
      category: details.category,
      placeId: details.placeId,
      address: details.address.trim(),
      ownerName: details.ownerName.trim(),
      phone,
      email: google.email,
      upiId: details.upiId.trim(),
      timings: { open: '08:00', close: '21:00' },
      deliveryTime: '30-40',
      isActive: false, // waits for admin approval
      subscription: { plan: 'Free trial', status: SUBSCRIPTION_STATUS.TRIAL, startDate: today, endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) },
    });
    // New shops are created "accepting orders"; keep it closed until the owner opens it.
    if (shop.isOpen) await apiPost('/shop/toggle-orders/', { shop_id: shop.id, status: false }).catch(() => {});
    forgetShops();
    return shopUser({ ...shop, isOpen: false }, google);
  }
  throw new ServiceError('NOT_FOUND');
}

export async function deleteAccount(user) {
  if (user.role === ROLES.CUSTOMER) {
    const orders = await getOrders({ customerId: user.customerId });
    if (orders.some((o) => ACTIVE_STATUSES.includes(o.status))) throw new ServiceError('ACTIVE_ORDERS');
    await apiPost('/user/delete/', { uid: user.customerId });
    const mod = await loadDb();
    const db = mod.getDb();
    db.customers = db.customers.filter((c) => c.id !== user.customerId);
    mod.commit();
    return true;
  }
  if (user.role === ROLES.SHOP) {
    const orders = await getOrders({ shopId: user.shopId });
    if (orders.some((o) => ACTIVE_STATUSES.includes(o.status))) throw new ServiceError('ACTIVE_ORDERS');
    await apiPost('/shop/delete/', { shop_id: user.shopId }); // also removes its products
    if (/^[0-9a-f-]{36}$/i.test(user.id)) await apiPost('/user/delete/', { uid: user.id }).catch(() => {});
    forgetShops();
    return true;
  }
  throw new ServiceError('NOT_FOUND');
}
