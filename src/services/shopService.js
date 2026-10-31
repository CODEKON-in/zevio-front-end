/**
 * Shops. Every call goes to the Zevio API (src/services/api/apiShops.js).
 * Screens use this file only, never the api/ folder directly.
 */
export { getShops, getShopById, searchAll, saveShop, setShopOpen, setShopActive } from './api/apiShops.js';
