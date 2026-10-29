/**
 * MOCK authentication. No passwords, no real Google sign-in.
 * Later this becomes Firebase Auth; the returned user shape stays the same:
 *   { id, name, phone, role, shopId?, partnerId?, customerId? }
 */
import { request } from './request.js';
import { USE_API } from './api/config.js';
import { loginCustomer, loginShop } from './api/apiAuth.js';
import { ServiceError, makeId } from '../utils/mock.js';
import { ROLES } from '../utils/constants.js';
import { cleanPhone } from '../utils/format.js';

/**
 * @param {'customer'|'shop'|'delivery'|'admin'} role
 * @param {{name?:string, phone?:string, shopId?:string, partnerId?:string}} [details]
 */
export function login(role, details = {}) {
  // API mode (used by the DEV role switcher): a test customer / the first shop when nothing is given.
  if (USE_API && role === ROLES.CUSTOMER) return loginCustomer(details.phone ? details : { name: 'Test Customer', phone: '9876500999' });
  if (USE_API && role === ROLES.SHOP) return loginShop(details);
  return request(({ getDb, commit }) => {
    const db = getDb();

    if (role === ROLES.CUSTOMER) {
      const phone = cleanPhone(details.phone);
      let customer = phone ? db.customers.find((c) => c.phone === phone) : db.customers[0];
      if (!customer) {
        customer = { id: makeId('c'), name: details.name || '', phone, isBlocked: false, addresses: [], createdAt: new Date().toISOString() };
        db.customers.push(customer);
        commit();
      } else if (details.name && details.name !== customer.name) {
        customer.name = details.name;
        commit();
      }
      if (customer.isBlocked) throw new ServiceError('BLOCKED');
      return { id: customer.id, customerId: customer.id, name: customer.name, phone: customer.phone, role };
    }

    if (role === ROLES.SHOP) {
      const shop = db.shops.find((s) => s.id === details.shopId) || db.shops[0];
      return { id: `u_${shop.id}`, shopId: shop.id, name: shop.ownerName, phone: shop.phone, role };
    }

    if (role === ROLES.DELIVERY) {
      const partner = db.partners.find((p) => p.id === details.partnerId) || db.partners[0];
      return { id: `u_${partner.id}`, partnerId: partner.id, name: partner.name, phone: partner.phone, role };
    }

    if (role === ROLES.ADMIN) {
      const admin = db.admins[0];
      return { id: admin.id, name: admin.name, phone: admin.phone, role };
    }

    throw new ServiceError('NOT_FOUND');
  });
}

export async function logout() {
  return true;
}
