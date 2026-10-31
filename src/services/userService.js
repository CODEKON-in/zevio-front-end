/**
 * Customers and delivery partners from the Zevio API.
 *
 * Saved delivery addresses are the one thing the API cannot store yet, so they
 * stay on the phone that typed them (src/services/addressBook.js).
 */
import * as api from './api/apiUsers.js';
import * as book from './addressBook.js';

export {
  getCustomers,
  updateCustomer,
  setCustomerBlocked,
  getPartners,
  getPartnerById,
  savePartner,
  setPartnerOnline,
} from './api/apiUsers.js';

/** The customer, with the addresses saved on this phone. */
export async function getCustomerById(id) {
  const customer = await api.getCustomerById(id);
  return { ...customer, addresses: book.listAddresses(id) };
}

/** Add (no id) or update a saved address. Returns the saved address. */
export async function saveAddress(customerId, address) {
  return book.saveAddress(customerId, address);
}

export async function deleteAddress(customerId, addressId) {
  return book.deleteAddress(customerId, addressId);
}
