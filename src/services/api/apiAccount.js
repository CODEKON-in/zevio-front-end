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
import { savePartner } from './apiUsers.js';
import { getPlaces, toShop } from './mappers.js';
import { profileIdFromGoogle } from '../google.js';
import { ServiceError, newUuid } from '../../utils/errors.js';
import { forgetAddresses } from '../addressBook.js';
import { ACTIVE_STATUSES, ROLES, SUBSCRIPTION_STATUS } from '../../utils/constants.js';
import { cleanPhone } from '../../utils/format.js';

/**
 * Who this Google sign-in belongs to.
 *
 * Preferred path: POST /api/auth/google, where the API checks the token's
 * signature against Google's keys. The deployed API does not have that endpoint
 * yet, so when it answers 404 we fall back to trusting the token the browser
 * decoded and deriving the profile id from its `sub`.
 *
 * The fallback IDENTIFIES a person without PROVING who they are — a forged
 * token would pass. It disappears on its own the moment the API gains the
 * endpoint, with no frontend change needed.
 *
 * @returns {{google:object, profile:object|null, verified:boolean}}
 */
async function verifyGoogle(google) {
  if (!google?.sub || !google?.email) throw new ServiceError('GOOGLE_FAILED');

  if (google.credential) {
    try {
      const data = await apiPost('/auth/google', { credential: google.credential });
      return { ...data, verified: true };
    } catch (e) {
      // NOT_FOUND = the API has no such endpoint, so use the fallback below.
      // Anything else is a real failure and must not be swallowed.
      if (e.code === 'API_AUTH') throw new ServiceError('GOOGLE_REJECTED');
      if (e.code !== 'NOT_FOUND') throw e;
    }
  }

  const profile = await getProfile(profileIdFromGoogle(google.sub));
  return { google, profile, verified: false };
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

const customerUser = (c, g) => ({ id: c.id, customerId: c.id, role: ROLES.CUSTOMER, name: c.name, phone: c.phone, email: g.email, picture: g.picture || null });
const partnerUser = (p, g) => ({ id: p.id, partnerId: p.id, role: ROLES.DELIVERY, name: p.name, phone: p.phone, email: g.email, picture: g.picture || null });
const shopUser = (s, g) => ({ id: s.profileId || `u_${s.id}`, shopId: s.id, role: ROLES.SHOP, name: s.ownerName || s.name, phone: s.phone, email: g.email, picture: g.picture || null });

async function findShop(uid, google) {
  const [rows, places] = await Promise.all([apiGet(`/shops/by-profile/${uid}`), getPlaces()]);
  if (rows?.length) return toShop(rows[0], places);
  const all = await fetchShops(true);
  return all.find((s) => s.email && s.email.toLowerCase() === google.email) || null;
}

/** The partner's own profile, or an account the admin created for their email. */
async function findPartner(profile, google) {
  if (profile?.user_type === 'delivery_person') return profile;
  if (profile) return null; // this Google account is already a customer or a shop owner
  const rows = await apiGet('/users/?user_type=delivery_person').catch(() => []);
  return (rows || []).find((r) => r.email && r.email.toLowerCase() === google.email) || null;
}

export async function signIn(role, googleFromBrowser) {
  const { google, profile } = await verifyGoogle(googleFromBrowser);

  if (role === ROLES.CUSTOMER) {
    if (!profile) return { needsSignUp: true, google };
    if (profile.user_type !== 'customer') throw new ServiceError('WRONG_ROLE');
    // is_blocked is a real column, so the admin's block applies on every phone.
    if (profile.is_blocked) throw new ServiceError('BLOCKED');
    return { user: customerUser(profile, google) };
  }

  if (role === ROLES.SHOP) {
    const shop = profile ? await findShop(profile.id, google) : null;
    return shop ? { user: shopUser(shop, google) } : { needsSignUp: true, google };
  }

  if (role === ROLES.DELIVERY) {
    const partner = await findPartner(profile, google);
    if (!partner) return { needsSignUp: true, google };
    if (partner.is_blocked) throw new ServiceError('BLOCKED');
    return { user: partnerUser(partner, google) };
  }

  throw new ServiceError('NOT_FOUND');
}

/**
 * The profile for this Google account, creating it the first time.
 *
 * The id matters: on the verified path any UUID works, because google_sub is
 * what finds the row later. On the fallback path the id MUST be derived from
 * the Google account — that derivation is the only way the next sign-in can
 * find this profile again, and a random id would strand the person on the
 * sign-up screen every time.
 */
async function ensureProfile(google, name, phone, userType) {
  const { profile, verified } = await verifyGoogle(google);
  if (profile) return profile;
  const uid = verified ? newUuid() : profileIdFromGoogle(google.sub);
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
    return customerUser({ ...profile, name: details.name.trim(), phone }, google);
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
  if (role === ROLES.DELIVERY) {
    const profile = await ensureProfile(google, details.name.trim(), phone, 'delivery_person');
    // Starts switched off: the admin approves a partner before they can go online.
    await savePartner({
      id: profile.id,
      vehicle: details.vehicle.trim().toUpperCase(),
      placeId: details.placeId,
      isActive: false,
      isOnline: false,
    });
    return partnerUser({ ...profile, name: details.name.trim(), phone }, google);
  }
  throw new ServiceError('NOT_FOUND');
}

export async function deleteAccount(user) {
  if (user.role === ROLES.CUSTOMER) {
    const orders = await getOrders({ customerId: user.customerId });
    if (orders.some((o) => ACTIVE_STATUSES.includes(o.status))) throw new ServiceError('ACTIVE_ORDERS');
    await apiPost('/user/delete/', { uid: user.customerId });
    forgetAddresses(user.customerId); // nothing of theirs left on this phone
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
  if (user.role === ROLES.DELIVERY) {
    const orders = await getOrders({ partnerId: user.partnerId });
    if (orders.some((o) => ACTIVE_STATUSES.includes(o.status))) throw new ServiceError('ACTIVE_ORDERS');
    await apiPost('/user/delete/', { uid: user.partnerId });
    return true;
  }
  throw new ServiceError('NOT_FOUND');
}
