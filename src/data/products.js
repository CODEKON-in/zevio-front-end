/**
 * Mock products (hotels and bakeries). isVeg: true = veg, false = non-veg.
 * `section` groups products inside a shop page.
 */

let n = 0;
const p = (shopId, name, price, section, isVeg, inStock = true) => ({
  id: `p${++n}`,
  shopId,
  name,
  price,
  section,
  isVeg,
  inStock,
  image: null,
});

export const products = [
  // s1 — Sri Murugan Bhavan (veg hotel)
  p('s1', 'Idli (2 pcs)', 20, 'Tiffin', true),
  p('s1', 'Ghee Roast Dosa', 60, 'Tiffin', true),
  p('s1', 'Masala Dosa', 55, 'Tiffin', true),
  p('s1', 'Ven Pongal', 45, 'Tiffin', true),
  p('s1', 'Medu Vada (1 pc)', 12, 'Tiffin', true),
  p('s1', 'Parotta (2) with Kurma', 50, 'Tiffin', true, false),
  p('s1', 'Veg Meals', 90, 'Meals', true),
  p('s1', 'Filter Coffee', 20, 'Beverages', true),

  // s2 — Star Biryani Centre
  p('s2', 'Chicken Biryani', 150, 'Biryani', false),
  p('s2', 'Mutton Biryani', 240, 'Biryani', false),
  p('s2', 'Egg Biryani', 110, 'Biryani', false),
  p('s2', 'Veg Biryani', 100, 'Biryani', true),
  p('s2', 'Parotta (2 pcs)', 30, 'Parotta', true),
  p('s2', 'Chicken Kothu Parotta', 120, 'Parotta', false),
  p('s2', 'Chicken 65', 130, 'Starters', false),

  // s3 — Annapoorna Mess
  p('s3', 'Full Meals', 100, 'Meals', true),
  p('s3', 'Non-veg Meals', 140, 'Meals', false),
  p('s3', 'Sambar Rice', 50, 'Variety Rice', true),
  p('s3', 'Lemon Rice', 45, 'Variety Rice', true),
  p('s3', 'Curd Rice', 40, 'Variety Rice', true),
  p('s3', 'Fish Fry', 80, 'Sides', false),

  // s4 — Sri Krishna Bakery
  p('s4', 'Veg Puffs', 20, 'Snacks', true),
  p('s4', 'Egg Puffs', 25, 'Snacks', false),
  p('s4', 'Chicken Puffs', 35, 'Snacks', false),
  p('s4', 'Honey Cake (1 pc)', 20, 'Snacks', true),
  p('s4', 'Black Forest Cake (½ kg)', 350, 'Cakes', true),
  p('s4', 'Butterscotch Cake (½ kg)', 380, 'Cakes', true),
  p('s4', 'Milk Bread', 40, 'Bread & Buns', true),
  p('s4', 'Tea Rusk (200 g)', 45, 'Bread & Buns', true),

  // s5 — Iyengar Bakery
  p('s5', 'Cream Bun', 15, 'Bread & Buns', true),
  p('s5', 'Coconut Bun', 15, 'Bread & Buns', true),
  p('s5', 'Dil Pasand', 25, 'Bread & Buns', true),
  p('s5', 'Plum Cake (250 g)', 120, 'Cakes', true),
  p('s5', 'Mixture (250 g)', 70, 'Savouries', true),
  p('s5', 'Murukku (250 g)', 80, 'Savouries', true),

  // s6 — Kaveri Tiffin Centre
  p('s6', 'Idiyappam (3 pcs)', 30, 'Tiffin', true),
  p('s6', 'Rava Dosa', 50, 'Tiffin', true),
  p('s6', 'Poori Masala', 45, 'Tiffin', true),
  p('s6', 'Rava Kesari', 25, 'Sweets', true),
  p('s6', 'Sambar Vada', 30, 'Tiffin', true),
  p('s6', 'Filter Coffee', 15, 'Beverages', true),

  // s7 — Rajagiri Parotta Stall
  p('s7', 'Parotta (2 pcs)', 30, 'Parotta', true),
  p('s7', 'Veechu Parotta', 35, 'Parotta', true),
  p('s7', 'Chilli Parotta', 70, 'Parotta', true),
  p('s7', 'Egg Kothu Parotta', 90, 'Parotta', false),
  p('s7', 'Chicken Salna', 60, 'Sides', false),
  p('s7', 'Veg Kurma', 30, 'Sides', true),

  // s8 — Selvam Military Hotel
  p('s8', 'Chicken Biryani', 140, 'Biryani', false),
  p('s8', 'Mutton Chukka', 180, 'Starters', false),
  p('s8', 'Country Chicken Gravy', 160, 'Gravies', false),
  p('s8', 'Fish Curry Meals', 130, 'Meals', false),
  p('s8', 'Egg Omelette', 20, 'Sides', false),
  p('s8', 'Non-veg Meals', 150, 'Meals', false, false),

  // s9 — Sweet Home Bakery
  p('s9', 'Veg Puffs', 18, 'Snacks', true),
  p('s9', 'Paneer Puffs', 30, 'Snacks', true),
  p('s9', 'Chocolate Cake (½ kg)', 360, 'Cakes', true),
  p('s9', 'Pineapple Pastry', 40, 'Cakes', true),
  p('s9', 'Milk Rusk (200 g)', 45, 'Bread & Buns', true),
  p('s9', 'Badam Milk', 30, 'Beverages', true),

  // s10 — New Royal Bakes & Sweets
  p('s10', 'Mysore Pak (250 g)', 120, 'Sweets', true),
  p('s10', 'Gulab Jamun (4 pcs)', 60, 'Sweets', true),
  p('s10', 'Fruit Bread', 45, 'Bread & Buns', true),
  p('s10', 'Butter Biscuits (200 g)', 70, 'Snacks', true),
  p('s10', 'Samosa (2 pcs)', 30, 'Snacks', true),
  p('s10', 'Red Velvet Cake (½ kg)', 420, 'Cakes', true),
];
