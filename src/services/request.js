import { fakeDelay, clone, ServiceError } from '../utils/mock.js';

/*
 * The demo database (all mock shops, products, orders…) is loaded lazily, in
 * parallel with the first fake network delay, so it is NOT part of the first
 * JavaScript download. When Firebase replaces the mock, this file goes away.
 */
let dbModule = null;
export function loadDb() {
  if (!dbModule) dbModule = import('./db.js');
  return dbModule;
}

let failNext = false;

/** DEV helper: the next service call will fail, so you can test error states. */
export function failNextRequest() {
  failNext = true;
}

/**
 * Wraps every mock call: waits like a network, then returns a deep copy.
 * `work` receives { getDb, commit } and runs AFTER the delay so it sees the latest data.
 */
export async function request(work) {
  const [db] = await Promise.all([loadDb(), fakeDelay()]);
  if (failNext) {
    failNext = false;
    throw new ServiceError('NETWORK');
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ServiceError('NETWORK');
  }
  return clone(await work(db));
}
