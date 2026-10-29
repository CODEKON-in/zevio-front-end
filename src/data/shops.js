/** Mock shops (hotels and bakeries) in the Papanasam – Ayyampettai area. Phone numbers and UPI IDs are fake. */

const DAY = 86400000;
const dateFromNow = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

const sub = (status, startDays, endDays, plan = 'Basic') => ({
  plan,
  status,
  startDate: dateFromNow(startDays),
  endDate: dateFromNow(endDays),
});

export const shops = [
  {
    id: 's1', name: 'Sri Murugan Bhavan', category: 'hotels', placeId: 'papanasam',
    address: 'Main Road, near Bus Stand',
    ownerName: 'Murugan', email: 'murugan.s1@gmail.com', phone: '9876500001', upiId: 'srimuruganbhavan@okaxis',
    timings: { open: '06:00', close: '22:00' }, isOpen: true, isActive: true, deliveryTime: '25-35', image: null,
    subscription: sub('ACTIVE', -40, 20),
  },
  {
    id: 's2', name: 'Star Biryani Centre', category: 'hotels', placeId: 'ayyampettai',
    address: 'Kumbakonam Road, opp. Indian Bank',
    ownerName: 'Abdul Rahman', email: 'abdulrahman.s2@gmail.com', phone: '9876500002', upiId: 'starbiryani@oksbi',
    timings: { open: '11:00', close: '23:00' }, isOpen: true, isActive: true, deliveryTime: '30-45', image: null,
    subscription: sub('ACTIVE', -10, 50),
  },
  {
    id: 's3', name: 'Annapoorna Mess', category: 'hotels', placeId: 'rajagiri',
    address: 'Temple Street',
    ownerName: 'Saraswathi', email: 'saraswathi.s3@gmail.com', phone: '9876500003', upiId: 'annapoornamess@okicici',
    timings: { open: '11:30', close: '15:30' }, isOpen: false, isActive: true, deliveryTime: '30-40', image: null,
    subscription: sub('ACTIVE', -25, 35),
  },
  {
    id: 's4', name: 'Sri Krishna Bakery', category: 'bakery', placeId: 'papanasam',
    address: 'Big Street, near Post Office',
    ownerName: 'Krishnan', email: 'krishnan.s4@gmail.com', phone: '9876500004', upiId: 'srikrishnabakery@okaxis',
    timings: { open: '07:00', close: '22:00' }, isOpen: true, isActive: true, deliveryTime: '20-30', image: null,
    subscription: sub('ACTIVE', -5, 25),
  },
  {
    id: 's5', name: 'Iyengar Bakery', category: 'bakery', placeId: 'ayyampettai',
    address: 'Bus Stand Road',
    ownerName: 'Ramanujam', email: 'ramanujam.s5@gmail.com', phone: '9876500005', upiId: 'iyengarbakery.ayp@okhdfc',
    timings: { open: '06:30', close: '21:30' }, isOpen: true, isActive: true, deliveryTime: '20-30', image: null,
    subscription: sub('TRIAL', -3, 27, 'Free trial'),
  },
  {
    id: 's6', name: 'Kaveri Tiffin Centre', category: 'hotels', placeId: 'pandaravadai',
    address: 'Main Road, near Panchayat Office',
    ownerName: 'Selvam', email: 'selvam.s6@gmail.com', phone: '9876500006', upiId: 'kaveritiffin@oksbi',
    timings: { open: '06:00', close: '21:00' }, isOpen: true, isActive: true, deliveryTime: '25-35', image: null,
    subscription: sub('ACTIVE', -60, 5),
  },
  {
    id: 's7', name: 'Rajagiri Parotta Stall', category: 'hotels', placeId: 'rajagiri',
    address: 'Bus Stop Corner',
    ownerName: 'Mani', email: 'mani.s7@gmail.com', phone: '9876500007', upiId: 'rajagiriparotta@okicici',
    timings: { open: '17:00', close: '23:30' }, isOpen: true, isActive: true, deliveryTime: '30-40', image: null,
    subscription: sub('ACTIVE', -15, 45),
  },
  {
    id: 's8', name: 'Selvam Military Hotel', category: 'hotels', placeId: 'pasupathikoil',
    address: 'Thanjavur Main Road',
    ownerName: 'Selvam', email: 'selvam.s8@gmail.com', phone: '9876500008', upiId: 'selvammilitary@okaxis',
    timings: { open: '11:30', close: '22:00' }, isOpen: true, isActive: true, deliveryTime: '30-45', image: null,
    subscription: sub('ACTIVE', -20, 40),
  },
  {
    id: 's9', name: 'Sweet Home Bakery', category: 'bakery', placeId: 'pasupathikoil',
    address: 'Sannathi Street',
    ownerName: 'Ganesh', email: 'ganesh.s9@gmail.com', phone: '9876500009', upiId: 'sweethomebakery@oksbi',
    timings: { open: '07:00', close: '22:00' }, isOpen: true, isActive: true, deliveryTime: '20-30', image: null,
    subscription: sub('ACTIVE', -8, 52),
  },
  {
    id: 's10', name: 'New Royal Bakes & Sweets', category: 'bakery', placeId: 'pandaravadai',
    address: 'Kamarajar Street',
    ownerName: 'Kannan', email: 'kannan.s10@gmail.com', phone: '9876500010', upiId: 'newroyalbakes@okaxis',
    timings: { open: '08:00', close: '21:00' }, isOpen: false, isActive: true, deliveryTime: '25-35', image: null,
    subscription: sub('EXPIRED', -40, -10),
  },
];
