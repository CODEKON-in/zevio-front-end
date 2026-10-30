import { request } from './request.js';
import { USE_API, isApiId } from './api/config.js';
import * as api from './api/apiUsers.js';
import { ServiceError, makeId } from '../utils/mock.js';
import { isSameDay } from '../utils/format.js';

/* ---------- Customers ---------- */

/** Customers with their order count (admin list). */
export function getCustomers() {
  if (USE_API) return api.getCustomers();
  return request(({ getDb, commit }) => {
    const db = getDb();
    return db.customers.map((c) => ({ ...c, orderCount: db.orders.filter((o) => o.customerId === c.id).length }));
  });
}

export function getCustomerById(id) {
  if (isApiId(id)) return api.getCustomerById(id);
  return request(({ getDb, commit }) => {
    const c = getDb().customers.find((x) => x.id === id);
    if (!c) throw new ServiceError('NOT_FOUND');
    return c;
  });
}

export function updateCustomer(id, patch) {
  if (isApiId(id)) return api.updateCustomer(id, patch);
  return request(({ getDb, commit }) => {
    const c = getDb().customers.find((x) => x.id === id);
    if (!c) throw new ServiceError('NOT_FOUND');
    Object.assign(c, patch);
    commit();
    return c;
  });
}

export function setCustomerBlocked(id, isBlocked) {
  return updateCustomer(id, { isBlocked });
}

/** Add (no id) or update a saved address. Returns the saved address. */
export function saveAddress(customerId, address) {
  return request(({ getDb, commit }) => {
    const c = getDb().customers.find((x) => x.id === customerId);
    if (!c) throw new ServiceError('NOT_FOUND');
    let saved;
    if (address.id) {
      const idx = c.addresses.findIndex((a) => a.id === address.id);
      if (idx === -1) throw new ServiceError('NOT_FOUND');
      saved = c.addresses[idx] = { ...c.addresses[idx], ...address };
    } else {
      saved = { label: 'Home', ...address, id: makeId('ad') };
      c.addresses.push(saved);
    }
    commit();
    return saved;
  });
}

export function deleteAddress(customerId, addressId) {
  return request(({ getDb, commit }) => {
    const c = getDb().customers.find((x) => x.id === customerId);
    if (!c) throw new ServiceError('NOT_FOUND');
    c.addresses = c.addresses.filter((a) => a.id !== addressId);
    commit();
    return true;
  });
}

/* ---------- Delivery partners ---------- */

/** Partners with today's delivered count. */
export function getPartners() {
  if (USE_API) return api.getPartners();
  return request(({ getDb, commit }) => {
    const db = getDb();
    const now = Date.now();
    return db.partners.filter((p) => !p.deleted).map((p) => ({
      ...p,
      todayDeliveries: db.orders.filter((o) => o.partnerId === p.id && o.status === 'DELIVERED' && isSameDay(o.createdAt, now)).length,
    }));
  });
}

export function getPartnerById(id) {
  if (isApiId(id)) return api.getPartnerById(id);
  return request(({ getDb, commit }) => {
    const p = getDb().partners.find((x) => x.id === id);
    if (!p) throw new ServiceError('NOT_FOUND');
    return p;
  });
}

/** Create (no id) or update a partner. */
export function savePartner(partner) {
  if (USE_API && (!partner.id || isApiId(partner.id))) return api.savePartner(partner);
  return request(({ getDb, commit }) => {
    const db = getDb();
    if (!partner.id) {
      const created = { isOnline: false, isActive: true, ...partner, id: makeId('d') };
      db.partners.push(created);
      commit();
      return created;
    }
    const p = db.partners.find((x) => x.id === partner.id);
    if (!p) throw new ServiceError('NOT_FOUND');
    Object.assign(p, partner);
    commit();
    return p;
  });
}

export function setPartnerOnline(id, isOnline) {
  return savePartner({ id, isOnline });
}
