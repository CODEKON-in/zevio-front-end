# Zevio API — changes the backend needs

The frontend is connected to the Zevio API (`zevio-apis-main`). This file lists what the API
must change or add so that every part of the app runs on real data. Items are in priority order.

I tested the app against a local copy of the API code (Flask + an in-memory stand-in for Supabase).
The live API at `zevio-apis.vercel.app` could not be reached from my test machine, so test one full
order on the live API after deploying.

---

## A. Done — the API code now does what its README says (29/10/2026)

These changes were made in `D:\projects\zevio-apis-main` so the code matches the README:

| File | README says | Was | Now |
|---|---|---|---|
| `shop.py`, `product.py` | Shop / product ids are UUIDs (every endpoint checks `is_valid_uuid`) | ids were `16-8-8-8-24` characters → adding failed, or the new item could not be used | `str(uuid4())` |
| `profile.py` | 404 when a user does not exist | crashed → 500 | returns `None` → **404 "user not found"** |
| `order.py` | "Creates an order along with its line items in a **single atomic operation**" | order saved, then items one by one; a failing item left a half order | all items saved in **one insert**; if anything fails, the order is removed again → nothing half-saved. Also fixed: a `unit_price` sent as text (`"20"`) broke the line total. |

| `main.py` + modules | 404 when the record does not exist | update / toggle / cancel / delete on a missing id answered **200 "ok"** | answers **404 "… not found"** (shop, product, order, item, user) |
| `main.py` | 400 for invalid input | an order item with a bad `product_id` crashed the insert → 500; `quantity: true` was accepted | **400** with a clear message |

Push the folder to GitHub (`CODEKON-in/zevio-apis`) so Vercel deploys it.

## A2. Still open (small)

### 3. `add_shop` / `add_product` do not return the new id
The app works around this by looking the record up by slug, which costs one extra call. Return it:
```python
# shop.py / product.py
new_id = str(uuid4())
shop_table.insert({... 'id': new_id ...}).execute()
return new_id            # main.py: return response('ok', {'id': result}, code=201)
```

### 4. Update endpoints do not validate values
`/api/shop/update/` and `/api/product/update/` store `attr_value` as-is (no length limit and no
`sanitize_str`), unlike the add endpoints. Apply the same validation as on add.

---

## B. Columns to add (the app stores these in text fields for now)

The app needs some data that has no column yet. Until the columns exist, it keeps that data inside
existing text fields, so every phone sees the same data:

| Where now | What is inside |
|---|---|
| `shops.description` ends with `#zevio {json}` | `category` (hotels/bakery), `ownerName`, `upiId`, `timings {open, close}`, `deliveryTime`, `isActive`, `subscription {plan, status, startDate, endDate}` |
| `products.description` ends with `#zevio {json}` | `section` (menu group, e.g. "Tiffin"), `isVeg` |
| `orders.delivery_address` = `street \| Landmark: … \| Directions: … \| Note: … \| Pay: UPI` | landmark, directions, customer instructions, payment method |

Please add real columns. When they exist, only `src/services/api/mappers.js` in the frontend changes.

```sql
-- shops
alter table shops add column category text not null default 'hotels';  -- 'hotels' | 'bakery'
alter table shops add column upi_id text;
alter table shops add column open_time time, add column close_time time;
alter table shops add column delivery_time text default '30-40';
alter table shops add column is_active boolean not null default true; -- admin on/off (separate from is_accepting_orders)
alter table shops add column subscription_plan text, add column subscription_status text,
                  add column subscription_start date, add column subscription_end date;

-- products
alter table products add column section text;
alter table products add column is_veg boolean;

-- orders
alter table orders add column payment_method text not null default 'COD';   -- 'UPI' | 'COD'
alter table orders add column payment_status text not null default 'pending'; -- 'pending' | 'paid'
alter table orders add column landmark text;
alter table orders add column instructions text;
alter table orders add column delivery_partner_id uuid references profiles(id);
alter table orders add column reject_reason text;
alter table orders add column accepted_at timestamptz, add column ready_at timestamptz,
                   add column picked_up_at timestamptz, add column delivered_at timestamptz,
                   add column cancelled_at timestamptz;

-- profiles
alter table profiles add column is_blocked boolean not null default false;
```
Then allow the new fields in `/api/shop/add/`, `/api/shop/update/` (`allowed_attrs`), `/api/product/add/`,
`/api/product/update/` and `/api/order/place/`.

---

## C. Order statuses — the app now uses the README lifecycle exactly

```
pending ──► confirmed ──► preparing ──► out_for_delivery ──► delivered
   └──► cancelled
```

- Customer can cancel while `pending`. Shop: **Accept** → `confirmed`, **Start preparing** → `preparing`, **Reject** → `cancelled`.
- Delivery partner: **Picked up** → `out_for_delivery` (only from `preparing`), **Delivered** → `delivered`.
- The shop's reject reason is not in the API, so other phones just see "Cancelled".
  Optional: add a `cancel_reason` column, and the time of each status change.
- Optional: make `update-status` refuse impossible moves (e.g. `delivered` → `pending`).

---

## D. Endpoints to add

| Needed for | Endpoint |
|---|---|
| Customer login on a second phone | `GET /api/user/by-phone/<phone>`. Today the app remembers the profile id on the phone that first logged in; on a new phone it creates a second profile. |
| Real sign-in | OTP or Google sign-in (e.g. Supabase Auth) that returns the profile. Today the login is a mock. |
| Admin: all orders | `GET /api/orders/?status=&date=`. Today the app asks for each shop's orders one by one. |
| Order lists with items | `GET /api/orders/by-shop/<id>?include=items` (and by-customer). Today the app makes one items call per order, but caches them. |
| Admin: customers & partners | `GET /api/users/?user_type=customer\|delivery_person`, plus `is_blocked` |
| Delivery partner app | `POST /api/order/assign-partner/` (`order_id`, `partner_id`), `GET /api/orders/by-partner/<id>`, partner online/offline |
| Saved addresses | `addresses` table + `GET/POST /api/user/<id>/addresses` (today they are stored on the phone only) |
| Platform settings | `GET/POST /api/settings/` (delivery fee, service places, platform UPI ID, support phone) |
| Photos | Image upload (e.g. Supabase Storage) that returns a URL for `logo_url` / `image_url` |
| Mark COD paid | `POST /api/order/mark-paid/` |

---

## E. Google sign-in

The app now signs everyone in (customers, shop owners, delivery partners) with **Google only**.

- Today the app reads the Google account in the browser and makes the profile id from it. That **identifies** the person, but it does not **prove** who they are: the browser could be faked.
- Please add `POST /api/auth/google` (field `credential` = the Google ID token). The API should verify the token with Google (`google-auth` library: `id_token.verify_oauth2_token(credential, requests.Request(), GOOGLE_CLIENT_ID)`), then find or create the profile by the Google `sub` / email, and return the profile plus a session token for later calls.
- Add `email` and `google_sub` columns to `profiles` (unique).
- Delivery partners: add `user_type = 'delivery_person'` profiles with `vehicle`, `base_place`, `is_active`. The app is ready to switch to them.

### Delete account
The app calls `POST /api/user/delete/` (customer) and `POST /api/shop/delete/` + `/api/user/delete/` (shop owner).
If `orders.customer_id` / `orders.shop_id` are foreign keys, these deletes fail while old orders exist.
Choose one: a soft delete (`profiles.deleted_at`, `shops.deleted_at`, and clear the personal fields), or `ON DELETE SET NULL` on those keys. Soft delete is recommended, because shops need their order history.

## F. Security

- **The API key must not be in the browser.** The frontend never sends it. It calls `/api/...` on its own site,
  and a small proxy adds `X-API-Key` (Vite locally, a Netlify edge function in production). The proxy only
  allows the endpoints the app uses; delete-user, delete-shop and delete-order are blocked.
- Even so, anyone can use the app's public `/api/...` like the app does. Real protection needs **per-user
  sign-in** in the API: a shop owner can change only their own shop, and a customer can see only their own orders.
  Supabase Auth + Row Level Security is the usual way.
- CORS is **not** needed while the proxy is used. If you ever call the API directly from a browser, add
  `flask-cors` limited to the app's domain.
- The `csrf` value in every reply is random and nothing checks it. Either remove it or implement real CSRF checks.
