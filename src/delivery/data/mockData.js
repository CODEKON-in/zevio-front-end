// Mock order data for MYNT Delivery Partner App
// Hyperlocal Grocery & Essentials Delivery: Papanasam to Ayyampettai corridor

const now = new Date();
const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d, h = 2) => new Date(now.getTime() - (d * 24 + h) * 60 * 60 * 1000).toISOString();

export const DELIVERY_PAYOUT_PER_ORDER = 35; // ₹35 per completed delivery

export const ORDER_STATUS_CONFIG = {
  assigned: {
    key: 'assigned',
    label: 'Assigned',
    nextStatus: 'picked_up',
    nextActionLabel: 'Picked Up from Shop',
    priority: 1
  },
  picked_up: {
    key: 'picked_up',
    label: 'Picked Up',
    nextStatus: 'out_for_delivery',
    nextActionLabel: 'Start Out for Delivery',
    priority: 2
  },
  out_for_delivery: {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    nextStatus: 'delivered',
    nextActionLabel: 'Mark as Delivered',
    priority: 0 // Highest priority on top of active list
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered',
    nextStatus: null,
    nextActionLabel: null,
    priority: 3
  }
};

export const ISSUE_REASONS = [
  'Customer phone unreachable / switched off',
  'Customer address hard to locate',
  'Item out of stock or missing at shop',
  'Shop closed or order preparation delayed',
  'Vehicle breakdown / weather delay',
  'Customer requested reschedule or cancellation'
];

export const INITIAL_ORDERS = [
  {
    orderId: 'MYNT-2048',
    customerName: 'Lakshmi Narayanan',
    customerPhone: '9443120981',
    deliveryAddress: 'No. 14, South Car Street, Near Perumal Kovil, Papanasam 614205',
    shopName: 'Sri Krishna Department Store',
    shopPhone: '9443011223',
    shopAddress: '42 Main Bazaar Road, Opposite Bus Stand, Papanasam 614205',
    items: [
      { name: 'Ponni Boiled Rice (5 kg Bag)', quantity: 1 },
      { name: 'Idhayam Gingelly Oil (1 L)', quantity: 1 },
      { name: 'Aavin Green Magic Milk (500 ml)', quantity: 3 },
      { name: 'Urad Dal Split (1 kg)', quantity: 1 },
      { name: 'Coriander & Curry Leaves Bundle', quantity: 2 }
    ],
    status: 'out_for_delivery',
    assignedAt: hoursAgo(0.8),
    deliveredAt: null,
    payout: 40,
    issueReported: null
  },
  {
    orderId: 'MYNT-2051',
    customerName: 'Abdul Rahman',
    customerPhone: '9842477812',
    deliveryAddress: '28/B, Gandhi Nagar 2nd Cross, Chakkarapalli Road, Ayyampettai 614201',
    shopName: 'Bismillah Fresh Vegetables & Fruits',
    shopPhone: '9789456120',
    shopAddress: 'Shop 7, Daily Market Complex, Ayyampettai 614201',
    items: [
      { name: 'Small Onion / Sambar Vengayam (1 kg)', quantity: 2 },
      { name: 'Country Tomato / Naatu Thakkali (1 kg)', quantity: 1 },
      { name: 'Nendran Banana (1 Dozen)', quantity: 1 },
      { name: 'Fresh Coconut (Medium)', quantity: 3 }
    ],
    status: 'picked_up',
    assignedAt: hoursAgo(0.5),
    deliveredAt: null,
    payout: 35,
    issueReported: null
  },
  {
    orderId: 'MYNT-2054',
    customerName: 'Meenakshi Sundaram',
    customerPhone: '9944182736',
    deliveryAddress: 'Door No. 8, Cauvery Nagar Extension, Rajagiri Post, Papanasam Taluk 614207',
    shopName: 'Annamalaiyar Provision & Maligai',
    shopPhone: '9442199887',
    shopAddress: '115 Kumbakonam Main Road, Papanasam 614205',
    items: [
      { name: 'Aashirvaad Whole Wheat Atta (2 kg)', quantity: 1 },
      { name: 'Toor Dal First Quality (1 kg)', quantity: 1 },
      { name: 'Sakthi Sambar Powder (100 g)', quantity: 2 },
      { name: 'Bru Instant Coffee Pouch (100 g)', quantity: 1 },
      { name: 'Country Eggs (Pack of 6)', quantity: 2 },
      { name: 'Parle-G Family Pack Biscuit', quantity: 1 }
    ],
    status: 'assigned',
    assignedAt: hoursAgo(0.25),
    deliveredAt: null,
    payout: 35,
    issueReported: null
  },
  {
    orderId: 'MYNT-2056',
    customerName: 'Revathi Balasubramanian',
    customerPhone: '9629034518',
    deliveryAddress: 'No. 5, Agraharam West Street, Kabisthalam Road Junction, Papanasam 614205',
    shopName: 'Cauvery Pharmacy & Wellness',
    shopPhone: '9865321470',
    shopAddress: '19 Old Post Office Street, Papanasam 614205',
    items: [
      { name: 'Horlicks Classic Malt Refill (500 g)', quantity: 1 },
      { name: 'Electral ORS Powder Sachet', quantity: 5 },
      { name: 'Dettol Antiseptic Liquid (250 ml)', quantity: 1 }
    ],
    status: 'assigned',
    assignedAt: hoursAgo(0.15),
    deliveredAt: null,
    payout: 35,
    issueReported: null
  },
  {
    orderId: 'MYNT-2044',
    customerName: 'Ganesan Pillai',
    customerPhone: '9443588120',
    deliveryAddress: '102, Railway Station Road, Papanasam 614205',
    shopName: 'Sri Krishna Department Store',
    shopPhone: '9443011223',
    shopAddress: '42 Main Bazaar Road, Opposite Bus Stand, Papanasam 614205',
    items: [
      { name: 'Gold Winner Sunflower Oil (1 L)', quantity: 2 },
      { name: 'Crystal Sugar (1 kg)', quantity: 2 },
      { name: '3 Roses Natural Care Tea (250 g)', quantity: 1 }
    ],
    status: 'delivered',
    assignedAt: hoursAgo(3.2),
    deliveredAt: hoursAgo(2.6),
    payout: 35,
    issueReported: null
  },
  {
    orderId: 'MYNT-2039',
    customerName: 'Fathima Begum',
    customerPhone: '9790123490',
    deliveryAddress: '19, Big Mosque Street, Ayyampettai 614201',
    shopName: 'Bismillah Fresh Vegetables & Fruits',
    shopPhone: '9789456120',
    shopAddress: 'Shop 7, Daily Market Complex, Ayyampettai 614201',
    items: [
      { name: 'Fresh Mutton Cut (500 g)', quantity: 1 },
      { name: 'Basmati Biryani Rice (1 kg)', quantity: 2 },
      { name: 'Mint & Coriander Bunch', quantity: 2 },
      { name: 'Curd Cup (400 g)', quantity: 1 }
    ],
    status: 'delivered',
    assignedAt: hoursAgo(5.0),
    deliveredAt: hoursAgo(4.3),
    payout: 40,
    issueReported: null
  },
  {
    orderId: 'MYNT-2021',
    customerName: 'Saravanan Kumar',
    customerPhone: '9843165432',
    deliveryAddress: '33, Kudamurutti River Bank Road, Ayyampettai 614201',
    shopName: 'Annamalaiyar Provision & Maligai',
    shopPhone: '9442199887',
    shopAddress: '115 Kumbakonam Main Road, Papanasam 614205',
    items: [
      { name: 'Idli Rice (5 kg Bag)', quantity: 1 },
      { name: 'Rock Salt / Kal Uppu (1 kg)', quantity: 1 },
      { name: 'Tamarind Seedless (500 g)', quantity: 1 }
    ],
    status: 'delivered',
    assignedAt: daysAgo(1, 4),
    deliveredAt: daysAgo(1, 3),
    payout: 35,
    issueReported: null
  },
  {
    orderId: 'MYNT-2015',
    customerName: 'Geetha Ramachandran',
    customerPhone: '9486210987',
    deliveryAddress: '64, North Street, Thirupalaithurai, Papanasam 614205',
    shopName: 'Sri Krishna Department Store',
    shopPhone: '9443011223',
    shopAddress: '42 Main Bazaar Road, Opposite Bus Stand, Papanasam 614205',
    items: [
      { name: 'Aavin Ghee Jar (500 ml)', quantity: 1 },
      { name: 'Cashew & Raisin Pack (200 g)', quantity: 1 },
      { name: 'Jaggery Powder / Naatu Sakkarai (1 kg)', quantity: 1 }
    ],
    status: 'delivered',
    assignedAt: daysAgo(2, 5),
    deliveredAt: daysAgo(2, 4),
    payout: 35,
    issueReported: null
  },
  {
    orderId: 'MYNT-1998',
    customerName: 'Murugavel Rajendran',
    customerPhone: '9500432189',
    deliveryAddress: '11, School Road, Pasupathikoil, Ayyampettai 614206',
    shopName: 'Bismillah Fresh Vegetables & Fruits',
    shopPhone: '9789456120',
    shopAddress: 'Shop 7, Daily Market Complex, Ayyampettai 614201',
    items: [
      { name: 'Potato (1 kg)', quantity: 1 },
      { name: 'Brinjal / Kathirikkai (500 g)', quantity: 1 },
      { name: 'Ladies Finger (500 g)', quantity: 1 },
      { name: 'Drumstick (Bundle of 4)', quantity: 1 }
    ],
    status: 'delivered',
    assignedAt: daysAgo(4, 3),
    deliveredAt: daysAgo(4, 2),
    payout: 35,
    issueReported: null
  },
  {
    orderId: 'MYNT-1940',
    customerName: 'Valliappan Chettiar',
    customerPhone: '9443908712',
    deliveryAddress: '7, Sannathi Street, Swamimalai Cross, Papanasam 614205',
    shopName: 'Annamalaiyar Provision & Maligai',
    shopPhone: '9442199887',
    shopAddress: '115 Kumbakonam Main Road, Papanasam 614205',
    items: [
      { name: 'Ponni Raw Rice (10 kg Bag)', quantity: 1 },
      { name: 'Roasted Gram / Pottukadalai (500 g)', quantity: 1 }
    ],
    status: 'delivered',
    assignedAt: daysAgo(10, 4),
    deliveredAt: daysAgo(10, 3),
    payout: 45,
    issueReported: null
  },
  {
    orderId: 'MYNT-1912',
    customerName: 'Anwar Basha',
    customerPhone: '9894011234',
    deliveryAddress: '45, Weaver Street, Ayyampettai 614201',
    shopName: 'Sri Krishna Department Store',
    shopPhone: '9443011223',
    shopAddress: '42 Main Bazaar Road, Opposite Bus Stand, Papanasam 614205',
    items: [
      { name: 'Surf Excel Detergent Bar (Pack of 4)', quantity: 1 },
      { name: 'Vim Dishwash Liquid (500 ml)', quantity: 1 },
      { name: 'Coconut Oil (500 ml)', quantity: 1 }
    ],
    status: 'delivered',
    assignedAt: daysAgo(14, 2),
    deliveredAt: daysAgo(14, 1),
    payout: 35,
    issueReported: null
  }
];
