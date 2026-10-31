# Zevio API — state of the backend

The whole app runs on the database now: every list, number and toggle in the
customer app, the shop panel, the delivery app and `/admin` is a row the API read
or wrote. There is no demo data left anywhere.

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
4. **Sign in to `/admin`** with the account `migration.sql` created (the password
   is in the API's README) and change that password.
5. **Admin → Settings:** the villages you serve, delivery fee, partner incentive,
   support phone / WhatsApp, platform UPI id. Shops and partners cannot be filed
   under a village until that list is right.

---

## What the API has

### Sign-in
- `POST /api/auth/google` — checks the Google ID token's signature, issuer,
  audience and expiry against Google's keys, then returns the person **and**
  their profile. A profile is found by `google_sub`; an account created earlier
  (or by the admin) is claimed by matching `email`.
- `POST /api/auth/admin` — email + password against a hash in `profiles`
  (Werkzeug PBKDF2/scrypt). Wrong details answer 401 without saying which.
- `POST /api/admin/add/` — creates an admin. Deliberately **not** in the app's
  proxy allowlist: it is a server-side call with the API key, never something a
  browser can do.

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

### Endpoints the app uses
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

- The admin path can be moved off `/admin` with `VITE_ADMIN_PATH` in the app.
  That **hides** the panel; it does not protect it (the value ships in the
  JavaScript bundle, because the browser has to know where to route). The
  password and the API's own checks are the real gate.
- `Zevio-delivery-app-main/database/*.sql` is the original schema. It is older
  than the live database — `migration.sql` is what brings a database up to date.
