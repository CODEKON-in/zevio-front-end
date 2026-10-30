import { request } from './request.js';
import { USE_API } from './api/config.js';
import * as api from './api/apiSettings.js';

/** @returns {Promise<{deliveryFee:number, partnerIncentive:number, servicePlaces:Array, supportPhone:string, supportWhatsApp:string, platformUpiId:string, platformUpiName:string}>} */
export function getSettings() {
  if (USE_API) return api.getSettings();
  return request(({ getDb, commit }) => getDb().settings);
}

/** Merge a partial update into settings (admin only). */
export function updateSettings(patch) {
  if (USE_API) return api.updateSettings(patch);
  return request(({ getDb, commit }) => {
    const db = getDb();
    db.settings = { ...db.settings, ...patch };
    commit();
    return db.settings;
  });
}
