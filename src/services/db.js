/**
 * In-memory mock database, saved to localStorage so that an order placed as a
 * customer is still there when you switch to the shop/delivery/admin role.
 *
 * ONLY services may import this file. When Firebase is added, the services
 * change and this file is deleted — UI code stays the same.
 */
import { shops } from '../data/shops.js';
import { products } from '../data/products.js';
import { admins, partners, customers } from '../data/users.js';
import { buildOrders } from '../data/orders.js';
import { settings } from '../data/settings.js';
import { readStorage, writeStorage } from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { clone } from '../utils/mock.js';

const DB_VERSION = 5; // 5: order statuses follow the API README

function seed() {
  return clone({
    version: DB_VERSION,
    shops,
    products,
    admins,
    partners,
    customers,
    orders: buildOrders(),
    settings,
    nextOrderNumber: 1016,
  });
}

function load() {
  const saved = readStorage(STORAGE_KEYS.MOCK_DB, null);
  if (saved && saved.version === DB_VERSION) return saved;
  const fresh = seed();
  writeStorage(STORAGE_KEYS.MOCK_DB, fresh);
  return fresh;
}

let db = load();

// Keep tabs in sync: when another tab saves (e.g. a customer places an order),
// reload so the shop / delivery / admin tab sees it on its next poll.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEYS.MOCK_DB || !e.newValue) return;
    try {
      const next = JSON.parse(e.newValue);
      if (next?.version === DB_VERSION) db = next;
    } catch {
      /* ignore bad data */
    }
  });
}

export function getDb() {
  return db;
}

/** Call after every write so the change survives a page refresh. */
export function commit() {
  writeStorage(STORAGE_KEYS.MOCK_DB, db);
}

export function resetDb() {
  // Keep what belongs to the real API (customer logins/addresses, order notes) — only demo data resets.
  const keepCustomers = db.customers.filter((c) => c.apiProfile);
  const keepExtras = db.apiExtras;
  db = seed();
  db.customers.push(...keepCustomers);
  if (keepExtras) db.apiExtras = keepExtras;
  commit();
}
