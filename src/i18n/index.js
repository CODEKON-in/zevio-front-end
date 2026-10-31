import en from './en.js';

function lookup(key) {
  let node = en;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
}

/**
 * Get a UI string from en.js. Components never hardcode text — they call t().
 *   t('common.itemsCount', { count: 3 }) → "3 items"
 * Uses `key_one` when params.count === 1. Returns the key itself if missing.
 */
export function t(key, params) {
  let value;
  if (params && params.count === 1) value = lookup(`${key}_one`);
  if (value === undefined) value = lookup(key);
  if (typeof value !== 'string') {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (params[name] !== undefined ? String(params[name]) : match));
}
