import { request } from './request.js';

/** @returns {Promise<{deliveryFee:number, partnerIncentive:number, servicePlaces:Array, supportPhone:string, supportWhatsApp:string, platformUpiId:string, platformUpiName:string}>} */
export function getSettings() {
  return request(({ getDb, commit }) => getDb().settings);
}

/** Merge a partial update into settings (admin only). */
export function updateSettings(patch) {
  return request(({ getDb, commit }) => {
    const db = getDb();
    db.settings = { ...db.settings, ...patch };
    commit();
    return db.settings;
  });
}
