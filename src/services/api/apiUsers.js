/**
 * A customer's own profile, and the delivery partner on one of their orders
 * (for the partner card on order tracking). Both are rows in `profiles`.
 *
 * A customer's saved addresses are per-device (the API has no addresses table
 * yet — see BACKEND-CHANGES.md §D).
 */
import { apiGet } from './client.js';
import { getPlaces, toCustomer, toPartner } from './mappers.js';
import { ServiceError } from '../../utils/errors.js';

export async function getCustomerById(id) {
  return toCustomer(await apiGet(`/user/${id}`));
}

export async function getPartnerById(id) {
  const [raw, places] = await Promise.all([apiGet(`/user/${id}`), getPlaces()]);
  if (raw?.user_type !== 'delivery_person') throw new ServiceError('NOT_FOUND');
  return toPartner(raw, places);
}
