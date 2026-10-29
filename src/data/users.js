/** Mock people. All phone numbers are fake. */

export const admins = [{ id: 'a1', name: 'Admin', phone: '9876500100', email: 'admin@zevio.in' }];

export const partners = [
  { id: 'd1', email: 'karthik.delivery@gmail.com', name: 'Karthik', phone: '9876500201', placeId: 'papanasam', vehicle: 'TN 49 AB 1234', isOnline: true, isActive: true },
  { id: 'd2', email: 'senthil.rider@gmail.com', name: 'Senthil', phone: '9876500202', placeId: 'ayyampettai', vehicle: 'TN 68 CD 5678', isOnline: true, isActive: true },
  { id: 'd3', email: 'prakash.tn49@gmail.com', name: 'Prakash', phone: '9876500203', placeId: 'rajagiri', vehicle: 'TN 49 EF 9012', isOnline: false, isActive: true },
];

const addr = (id, name, phone, placeId, street, landmark, notes = '') => ({
  id, label: 'Home', name, phone, placeId, street, landmark, notes,
});

export const customers = [
  {
    id: 'c1', email: 'ramesh.kumar@gmail.com', name: 'Ramesh Kumar', phone: '9876500301', isBlocked: false, createdAt: '2026-09-02T10:00:00.000Z',
    addresses: [addr('ad1', 'Ramesh Kumar', '9876500301', 'papanasam', '12, South Street', 'Behind Vinayagar Temple')],
  },
  {
    id: 'c2', email: 'fathima.beevi@gmail.com', name: 'Fathima Beevi', phone: '9876500302', isBlocked: false, createdAt: '2026-09-10T10:00:00.000Z',
    addresses: [addr('ad2', 'Fathima Beevi', '9876500302', 'ayyampettai', '4/56, Pallivasal Street', 'Near Big Mosque', 'Call before coming')],
  },
  {
    id: 'c3', email: 'selvi.m@gmail.com', name: 'Selvi Murugesan', phone: '9876500303', isBlocked: false, createdAt: '2026-09-15T10:00:00.000Z',
    addresses: [addr('ad3', 'Selvi Murugesan', '9876500303', 'rajagiri', '22, Middle Street', 'Opposite ration shop')],
  },
  {
    id: 'c4', email: 'arun.prasad@gmail.com', name: 'Arun Prasad', phone: '9876500304', isBlocked: false, createdAt: '2026-09-21T10:00:00.000Z',
    addresses: [addr('ad4', 'Arun Prasad', '9876500304', 'pasupathikoil', '7, Agraharam', 'Next to Pasupathishwarar Temple tank')],
  },
  {
    id: 'c5', email: 'meena.sundaram@gmail.com', name: 'Meena Sundaram', phone: '9876500305', isBlocked: false, createdAt: '2026-10-01T10:00:00.000Z',
    addresses: [addr('ad5', 'Meena Sundaram', '9876500305', 'pandaravadai', '3, Kamarajar Street', 'Near government school')],
  },
];
