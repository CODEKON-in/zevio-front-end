/**
 * Accounts for customers, shop owners and delivery partners: Google sign-in,
 * first-time sign-up, and delete account.
 *
 * A signed-in user looks like:
 *   { id, role, name, phone, email, picture, customerId? | shopId? | partnerId? }
 *
 * Demo mode keeps people in the demo database. API mode keeps customers and
 * shops in the Zevio API (delivery partners are not in the API yet).
 */
import { request } from './request.js';
import { ServiceError, makeId } from '../utils/mock.js';
import { ACTIVE_STATUSES, ORDER_STATUS, ROLES, SUBSCRIPTION_STATUS } from '../utils/constants.js';
import { cleanPhone } from '../utils/format.js';
import { USE_API } from './api/config.js';
import * as apiAccount from './api/apiAccount.js';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const sameGoogle = (rec, g) => rec && !rec.deleted && ((rec.googleId && rec.googleId === g.sub) || (rec.email && rec.email.toLowerCase() === g.email));

function customerUser(c, g) {
  return { id: c.id, customerId: c.id, role: ROLES.CUSTOMER, name: c.name, phone: c.phone, email: c.email || g?.email || '', picture: g?.picture || null };
}
function shopUser(s, g) {
  return { id: `u_${s.id}`, shopId: s.id, role: ROLES.SHOP, name: s.ownerName || s.name, phone: s.phone, email: s.email || g?.email || '', picture: g?.picture || null };
}
function partnerUser(p, g) {
  return { id: `u_${p.id}`, partnerId: p.id, role: ROLES.DELIVERY, name: p.name, phone: p.phone, email: p.email || g?.email || '', picture: g?.picture || null };
}

/* ======================= sign in ======================= */

/**
 * @param {'customer'|'shop'|'delivery'} role
 * @param {{sub, email, name, picture}} google
 * @returns {Promise<{user:object} | {needsSignUp:true}>}
 */
export function signInWithGoogle(role, google) {
  if (USE_API && role !== ROLES.DELIVERY) return apiAccount.signIn(role, google);
  return request(({ getDb, commit }) => {
    const db = getDb();
    if (role === ROLES.CUSTOMER) {
      const c = db.customers.find((x) => sameGoogle(x, google));
      if (!c) return { needsSignUp: true };
      if (c.isBlocked) throw new ServiceError('BLOCKED');
      c.googleId = google.sub;
      commit();
      return { user: customerUser(c, google) };
    }
    if (role === ROLES.SHOP) {
      const s = db.shops.find((x) => sameGoogle({ ...x, googleId: x.ownerGoogleId }, google));
      if (!s) return { needsSignUp: true };
      s.ownerGoogleId = google.sub;
      commit();
      return { user: shopUser(s, google) };
    }
    if (role === ROLES.DELIVERY) {
      const p = db.partners.find((x) => sameGoogle(x, google));
      if (!p) return { needsSignUp: true };
      p.googleId = google.sub;
      commit();
      return { user: partnerUser(p, google) };
    }
    throw new ServiceError('NOT_FOUND');
  });
}

/* ======================= sign up ======================= */

/**
 * First-time sign-up after Google.
 * details — customer: {name, phone}
 *           shop:     {ownerName, phone, shopName, category, placeId, address, upiId}
 *           delivery: {name, phone, vehicle, placeId}
 * New shops and partners start switched OFF until the admin approves them.
 */
export function completeSignUp(role, google, details) {
  if (USE_API && role !== ROLES.DELIVERY) return apiAccount.signUp(role, google, details);
  return request(({ getDb, commit }) => {
    const db = getDb();
    const phone = cleanPhone(details.phone);
    if (role === ROLES.CUSTOMER) {
      const c = { id: makeId('c'), googleId: google.sub, email: google.email, name: details.name.trim(), phone, isBlocked: false, addresses: [], createdAt: new Date().toISOString() };
      db.customers.push(c);
      commit();
      return customerUser(c, google);
    }
    if (role === ROLES.SHOP) {
      const s = {
        id: makeId('s'),
        name: details.shopName.trim(),
        category: details.category,
        placeId: details.placeId,
        address: details.address.trim(),
        ownerName: details.ownerName.trim(),
        email: google.email,
        ownerGoogleId: google.sub,
        phone,
        upiId: details.upiId.trim(),
        timings: { open: '08:00', close: '21:00' },
        isOpen: false,
        isActive: false,
        deliveryTime: '30-40',
        image: null,
        subscription: { plan: 'Free trial', status: SUBSCRIPTION_STATUS.TRIAL, startDate: today(), endDate: plusDays(30) },
        createdAt: new Date().toISOString(),
      };
      db.shops.push(s);
      commit();
      return shopUser(s, google);
    }
    if (role === ROLES.DELIVERY) {
      const p = {
        id: makeId('d'),
        googleId: google.sub,
        email: google.email,
        name: details.name.trim(),
        phone,
        vehicle: details.vehicle.trim().toUpperCase(),
        placeId: details.placeId,
        isOnline: false,
        isActive: false,
        createdAt: new Date().toISOString(),
      };
      db.partners.push(p);
      commit();
      return partnerUser(p, google);
    }
    throw new ServiceError('NOT_FOUND');
  });
}

/* ======================= delete account ======================= */

/**
 * Deletes the signed-in person's account. Refused while they have orders in progress.
 * Past orders are kept (shops and the platform need them for accounts), but they
 * no longer point to a usable account.
 */
export function deleteAccount(user) {
  if (USE_API && user.role !== ROLES.DELIVERY) return apiAccount.deleteAccount(user);
  return request(({ getDb, commit }) => {
    const db = getDb();
    const active = (o) => ACTIVE_STATUSES.includes(o.status);

    if (user.role === ROLES.CUSTOMER) {
      if (db.orders.some((o) => o.customerId === user.customerId && active(o))) throw new ServiceError('ACTIVE_ORDERS');
      db.customers = db.customers.filter((c) => c.id !== user.customerId);
    } else if (user.role === ROLES.SHOP) {
      const s = db.shops.find((x) => x.id === user.shopId);
      if (!s) throw new ServiceError('NOT_FOUND');
      if (db.orders.some((o) => o.shopId === s.id && active(o))) throw new ServiceError('ACTIVE_ORDERS');
      // Kept (hidden) so old orders still show the shop name.
      Object.assign(s, { deleted: true, isActive: false, isOpen: false, ownerName: '', phone: '', email: null, ownerGoogleId: null, upiId: '' });
      db.products = db.products.filter((p) => p.shopId !== s.id);
    } else if (user.role === ROLES.DELIVERY) {
      const p = db.partners.find((x) => x.id === user.partnerId);
      if (!p) throw new ServiceError('NOT_FOUND');
      const busy = db.orders.some(
        (o) => o.partnerId === p.id && (o.status === ORDER_STATUS.OUT_FOR_DELIVERY || o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.PREPARING),
      );
      if (busy) throw new ServiceError('ACTIVE_ORDERS');
      Object.assign(p, { deleted: true, isActive: false, isOnline: false, phone: '', email: null, googleId: null });
    } else {
      throw new ServiceError('NOT_FOUND');
    }
    commit();
    return true;
  });
}
