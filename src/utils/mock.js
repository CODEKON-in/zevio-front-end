import { MOCK_DELAY } from './constants.js';

/** Waits a random 300–600 ms to feel like a real network call. */
export function fakeDelay(min = MOCK_DELAY.min, max = MOCK_DELAY.max) {
  const ms = Math.round(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Deep copy so callers can never mutate the mock database. */
export function clone(value) {
  if (value === undefined) return undefined;
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

/** Error with a machine-readable code (UI maps code → translated text). */
export class ServiceError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

export function makeId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
