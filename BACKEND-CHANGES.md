# Zevio API — state of the backend

The website is now **the customer app only** — the admin panel, shop panel and
delivery app were removed. Shops, products, order statuses, settings and villages
are managed directly in Supabase (or with `npm run seed:demo`). The app's proxy
forwards only the customer endpoints, so none of the management endpoints below
can be reached from the website.

This file records what the backend does, what you must do once, and what is
still missing.

---

## Do this once, in this order

The API reads columns that do not exist in the original tables, so **run the
migration before deploying the API**. The other way round breaks the live app:
Supabase errors on an unknown column, so `/api/user/<uid>` would answer 500.

1. **Supabase → SQL Editor → run `zevio-apis-main/migration.sql`** (safe to run
   more than once). It adds every column and table below, fixes the order-status
   rule, loads the five villages, and creates the admin account.
2. **Push `zevio-apis-main`** to `CODEKON-in/zevio-apis` so Vercel redeploys.
3. **Check the API's environment variables** (Vercel → the API project →
   Settings → Environment Variables), then redeploy:
   - `API_KEY` — exactly that name, same value as `ZEVIO_API_KEY` in the app.
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
   - `GOOGLE_CLIENT_ID` — the same OAuth client id the app uses. Without it
     `/api/auth/google` answers 404 and the app falls back to trusting the
     browser's own reading of the Google token.
4. **Supabase → Table Editor → `settings` / `places`:** the villages you serve,
   delivery fee, support phone / WhatsApp, platform UPI id. Shops cannot be filed
   under a village until that list is right.

---

## What the API has

### Sign-in
- `POST /api/auth/google` — checks the Google ID token's signature, issuer,
  audience and expiry against Google's keys, then returns the person **and**
  their profile. A profile is found by `google_sub`; an account created earlier
  (or added in the database) is claimed by matching `email`.
- `POST /api/auth/admin` and `POST /api/admin/add/` still exist in the API but
  are **not** in the app's proxy allowlist; nothing on the website uses them.

### Real columns instead of text-field hacks
Earlier versions packed data the database lacked into existing text fields (shop
extras as a `#zevio {json}` line inside `description`, order extras as tags
inside `delivery_address`). Those are gone — what a screen shows is what the
database holds:

| Table | Columns added |
| --- | --- |
| `shops` | `category`, `owner_name`, `upi_id`, `open_time`, `close_time`, `delivery_time`, `is_active`, `subscription_plan/_status/_start/_end` |
| `products` | `section`, `is_veg` |
| `orders` | `delivery_partner_id`, `payment_method`, `payment_status`, `landmark`, `directions`, `instructions`, `reject_reason`, `confirmed_at`, `preparing_at`, `out_for_delivery_at`, `delivered_at`, `cancelled_at` |
| `profiles` | `email`, `google_sub`, `password_hash`, `is_blocked`, `is_active`, `is_online`, `vehicle`, `base_place` |
| new tables | `places` (the service area), `settings` (one row), `addresses` |

### Other endpoints the API has (not reachable from the website)
`/api/users/?user_type=…`, `/api/places/` + `/api/place/{add,update,delete}/`,
`/api/settings/` (GET and POST), `/api/shop/set-active/`, `/api/orders/` with
`status` and `date` filters, `/api/orders/by-partner/<id>`,
`/api/order/assign-partner/`, `/api/order/mark-paid/`, `/api/order/items/`
(the items of up to 200 orders in one call), and `/api/user/<id>/addresses/`
with `/api/address/{add,update,delete}/`.

Deleting a customer or shop no longer fails because of their old orders:
`orders.customer_id` and `orders.shop_id` are `ON DELETE SET NULL`, so finished
orders stay as records with the personal link emptied.

---

## What is still missing

| Needed for | What |
| --- | --- |
| **Real security** | The API key says *an app* is calling, not *who*. `/api/auth/google` proves identity; the next step is a session token the other endpoints check, so a shop owner can only change their own shop and a customer only see their own orders (Supabase Row Level Security is the usual route). |
| **Trusted prices** | `/api/order/place/` takes `unit_price` and the totals from the caller. The app re-reads prices before sending, but the API should read them from `products` and compute the totals itself. |
| **Status rules** | `update-status` accepts any status. The app enforces the flow; the API should refuse impossible moves (`delivered` → `pending`). |
| **Photos** | No upload endpoint: `logo_url` / `image_url` take links only, so the shop and product forms can preview a photo but not upload it. |
| **Saved addresses** | The `addresses` table and its endpoints exist, but the app still keeps addresses on the phone (`src/services/addressBook.js`). Moving to the API is a change in that one file. |
| **`csrf`** | The value in every reply is random and nothing checks it — make it real or drop it. |

---

## Notes

- `Zevio-delivery-app-main/database/*.sql` is the original schema. It is older
  than the live database — `migration.sql` is what brings a database up to date.
