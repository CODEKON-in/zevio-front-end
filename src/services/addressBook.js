/**
 * A customer's saved delivery addresses.
 *
 * The API has no addresses table yet (BACKEND-CHANGES.md), so they are kept on
 * the phone that typed them. They are the person's own addresses — nothing is
 * invented here — but they do not follow them to another phone yet. Every order
 * carries its own copy of the address, so order history is never affected.
 */
import { readStorage, writeStorage } from '../utils/storage.js';
import { newUuid, ServiceError } from '../utils/errors.js';

const KEY = 'zevio.addresses';

/** { [customerId]: Address[] } */
function all() {
  const saved = readStorage(KEY, null);
  return saved && typeof saved === 'object' ? saved : {};
}

export function listAddresses(customerId) {
  if (!customerId) return [];
  const list = all()[customerId];
  return Array.isArray(list) ? list : [];
}

/** Add (no id) or update one address. Returns the saved address. */
export function saveAddress(customerId, address) {
  if (!customerId) throw new ServiceError('NOT_FOUND');
  const book = all();
  const list = Array.isArray(book[customerId]) ? [...book[customerId]] : [];
  let saved;
  if (address.id) {
    const idx = list.findIndex((a) => a.id === address.id);
    if (idx === -1) throw new ServiceError('NOT_FOUND');
    saved = { ...list[idx], ...address };
    list[idx] = saved;
  } else {
    saved = { label: 'Home', ...address, id: newUuid() };
    list.push(saved);
  }
  book[customerId] = list;
  writeStorage(KEY, book);
  return saved;
}

export function deleteAddress(customerId, addressId) {
  const book = all();
  book[customerId] = listAddresses(customerId).filter((a) => a.id !== addressId);
  writeStorage(KEY, book);
  return true;
}

/** Called when the account is deleted, so nothing of theirs is left behind. */
export function forgetAddresses(customerId) {
  const book = all();
  delete book[customerId];
  writeStorage(KEY, book);
}
