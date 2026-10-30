# Zevio API — state of the backend

The admin panel runs entirely on the database now. Every list, number and toggle in
`/admin` is a row the API read or wrote — there is no demo data behind those screens.

Getting there needed a migration and new endpoints. This file records what was done
and what is still missing.

---

## Deploy order (important)

The new API code reads columns that do not exist yet, so **run the migration before
deploying the API**. Pushing first would break the live customer app: `PUBLIC_COLUMNS`
in `profile.py` selects `is_blocked`, `vehicle`, `base_place`, `is_active` and
`is_online`, and Supabase errors on an unknown column, so every `/api/user/<uid>`
call would answer 500.

1. Supabase → SQL Editor → run `Zevio-delivery-app/database/migrations/001_admin_real_data.sql`
   (safe to run more than once).
2. Push `zevio-api` so Vercel redeploys.
3. Create the first admin — the API hashes the password:
   ```bash
   curl -X POST https://zevio-apis.vercel.app/api/admin/add/ \
     -H "X-API-Key: $ZEVIO_API_KEY" \
     -d "name=Admin" -d "email=admin@zevio.in" -d "phone=9876500100" -d "password=choose-a-strong-one"
   ```
   `/api/admin/add/` is deliberately **not** in the frontend proxy's allowlist: making
   an admin stays a server-side call with the API key, never something a browser can do.
4. Add the places you serve in admin → Settings (or insert into `service_places`).
   Partners and shops cannot be filed under a place until this list exists.
5. Create `zevio-front-end/.env.local` from `.env.example` with `VITE_DATA_SOURCE=api`,
   `ZEVIO_API_URL` and `ZEVIO_API_KEY`. Without it the app still runs on demo data.

---

## A. Done

### Bugs fixed in the API

| | Was | Now |
|---|---|---|
| `shop.py`, `product.py` | ids built as `token_hex(8)+'-'+token_hex(4)+…` → **16-8-8-8-24** characters, not a UUID, so every later endpoint rejected the new record | `uuid4()`, and the new id comes back as `data.id` |
| `profile.py` | `users.data[0]` on an unknown id → `IndexError` → **500** | **404 `user not found`** |
| `shops.postal_code` | `NOT NULL`, but `/api/shop/add/` never sent one, so inserts failed | the migration drops that `NOT NULL` |
| `order.py` | items inserted one at a time; a failing item left half an order | one insert for all lines, and the order row is removed again if it fails |
| `main.py` | `quantity: true` accepted as `1` | **400** (a bool is an int in Python — checked explicitly) |
| `main.py` | update / toggle / cancel on a missing id answered **200 `ok`** | **404** |

### Columns added, text-field hacks removed

The app used to hide data the schema lacked inside existing text fields. All of it is
real columns now, and `src/services/api/mappers.js` reads them directly:

- `shops.description` no longer carries a `#zevio {json}` line. `category`, `owner_name`,
  `upi_id`, `open_time`, `close_time`, `delivery_time`, `is_active` and the four
  `subscription_*` columns exist.
- `products.description` no longer carries one either: `section` and `is_veg` are columns.
- `orders.delivery_address` is just the street. `landmark`, `directions`, `instructions`,
  `payment_method` and `payment_status` are columns, so it is no longer packed as
  `street | Landmark: … | Pay: COD`.
- `orders.delivery_partner_id` is a real foreign key. The assignment used to live in one
  browser's `localStorage`, so only the device that made it could see it.
- One timestamp per status (`confirmed_at` … `cancelled_at`) plus `reject_reason`, so the
  tracking timeline and the reason an order was rejected read the same on every phone.
- `profiles.is_blocked`, and `vehicle` / `base_place` / `is_active` / `is_online` for
  delivery partners.
- `platform_settings` (one row) and `service_places` replace the per-device settings.

### Endpoints added

```
GET  /api/users/?user_type=                 admin Customers and Partners lists
GET  /api/user/by-phone/<phone>
POST /api/admin/add/                        create an admin (API key only)
POST /api/auth/admin                        admin login, password checked against the hash
GET  /api/orders/?status=&date=             every order, for the admin list + dashboard
GET  /api/orders/by-partner/<id>
GET  /api/order/items/?order_ids=a,b,c      items for a whole list in one call
POST /api/order/assign-partner/
POST /api/order/mark-paid/
POST /api/shop/set-active/                  admin show/hide, separate from toggle-orders
GET/POST /api/settings/
GET  /api/places/   POST /api/place/add|update|delete/
```

`/api/user/update/`, `/api/shop/update/` and `/api/product/update/` now validate values
the same way the add endpoints do, and the shop/product ones accept either one
`attr`/`attr_value` pair or any number of columns in a single request.

`password_hash` is never returned by any endpoint.

Admins are `profiles` rows with `user_type = 'admin'`; the migration widens the
`user_type` CHECK to allow it.

---

## B. Still missing

Nothing the admin panel shows depends on these, but the rest of the app does:

| Needed for | What |
|---|---|
| Real sign-in | `POST /api/auth/google` verifying the Google ID token server-side. Today the app derives the profile id from the Google account in the browser, which **identifies** someone without **proving** who they are. Add `email` + `google_sub` (unique) to `profiles`. |
| Saved addresses | An `addresses` table + `GET/POST /api/user/<id>/addresses`. Customer addresses are still per-device, which is why the admin Customers table shows the place of a customer's most recent **order** instead of a saved address. |
| Photos | Image upload (Supabase Storage) returning a URL for `logo_url` / `image_url`. The shop and product forms preview a chosen file but cannot upload it. |
| Delete account | `orders.customer_id` / `shop_id` are `ON DELETE RESTRICT`, so deleting fails while old orders exist. Prefer a soft delete (`deleted_at` + clear the personal fields); shops need their order history. |
| Status rules | `update-status` still accepts any status. The app enforces the flow, but the API should refuse impossible moves (`delivered` → `pending`). |

## C. Security

- **The API key is never in the browser.** The app calls same-site `/api/...` and a proxy
  adds `X-API-Key` (Vite in dev, `netlify/edge-functions/api.js` in production). The proxy
  passes only the endpoints the app uses.
- Anyone can still call the app's public `/api/...` the way the app does. Real protection
  needs per-user authorisation **in the API**: a shop owner able to change only their own
  shop, a customer able to see only their own orders. Supabase Auth + Row Level Security is
  the usual route. Admin login is a password check, not a session — there is no token, so
  the admin endpoints are protected by the proxy allowlist and the API key, not by who is
  signed in.
- The `csrf` value in every reply is random and nothing checks it. Either implement real
  CSRF checks or drop the field.
