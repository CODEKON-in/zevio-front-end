/**
 * Mock platform settings. Admin can edit these later (Phase 5).
 * TODO: confirm the exact list of villages between Papanasam and Ayyampettai.
 */
export const servicePlaces = [
  { id: 'papanasam', name: 'Papanasam' },
  { id: 'rajagiri', name: 'Rajagiri' },
  { id: 'pandaravadai', name: 'Pandaravadai' },
  { id: 'pasupathikoil', name: 'Pasupathikoil' },
  { id: 'ayyampettai', name: 'Ayyampettai' },
];

export const settings = {
  deliveryFee: 20,
  partnerIncentive: 10,
  servicePlaces,
  supportPhone: '9876500000',
  supportWhatsApp: '9876500000',
  platformUpiId: 'zevio@upi',
  platformUpiName: 'Zevio',
};
