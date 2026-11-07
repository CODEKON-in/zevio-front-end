# Mynt — hyperlocal food delivery (customer app)

Food delivery for **Papanasam ↔ Ayyampettai**, from **hotels and bakeries only**.
Built with React and Vite, styled with plain CSS, English only. This repository is the **customer web
app only**. It has no admin panel, shop panel or delivery-partner app. Every
screen reads its data from the API (`zevio-apis`); the app has no demo or offline data.

> Every UI string lives in `src/i18n/en.js` and is read with `t('key')`.
> Shop categories: `src/utils/constants.js` → `SHOP_CATEGORIES = ['hotels', 'bakery']`.

## Before it runs

| | Where | Why |
| --- | --- | --- |
| **API deployed** | `zevio-apis` on Vercel | all data |
| **`migration.sql` run once** | Supabase → SQL Editor | tables and columns this app needs |
| **`API_KEY`** | Vercel (API project) **and** `.env.local` here | the app's proxy adds it to every call |
| **Google OAuth client id** | Google Cloud → Credentials | how customers sign in |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (and on your phone via the Network URL)
npm run build      # production build in dist/
npm run check      # codebase rule checks
npm run seed:demo  # add a demo shop with a few items (uses .env.local)
```

Copy `.env.example` to `.env.local`:

```
ZEVIO_API_URL=https://zevio-apis.vercel.app
ZEVIO_API_KEY=<the API_KEY from the API project>
VITE_GOOGLE_CLIENT_ID=<your Google OAuth client id>
```

The API key **never reaches the browser**. The app calls `/api/...` on its own
address, and a proxy adds `X-API-Key`: `vite.config.js` does this during development,
`api/proxy.js` (a Vercel function) does it once deployed. The proxy forwards
**only the customer endpoints** (shops, products, settings, the customer's own
profile and orders, placing and cancelling an order, Google sign-in). Nothing
that changes shops, products, order statuses, users or settings can be reached
from the website.

**Deploying (Vercel):** `vercel.json` builds with Vite and sends every other path
to `index.html`. In Vercel → Settings → Environment Variables, add
`ZEVIO_API_URL`, `ZEVIO_API_KEY` and `VITE_GOOGLE_CLIENT_ID`, then deploy.

## Managing shops, menus and orders

There is no admin UI. Manage the data directly in the database (Supabase → Table
Editor):

- **Shops:** the `shops` table. Set `is_active` to show or hide a shop.
- **Products:** the `products` table.
- **Order status:** the `orders.status` column. The customer's tracking screen follows it:
  `Pending → Confirmed → Preparing → Out for delivery → Delivered`, or `Cancelled`.
- **Delivery fee, support phone / WhatsApp, platform UPI id, villages:** the
  settings row.
- **Demo shop:** `npm run seed:demo`.

## Customer app

| Route | Screen |
| --- | --- |
| `/` | Sign in with Google, then Home: address chip, search, category chips, shops |
| `/location` | Location step (GPS first; manual area only after a failure) |
| `/welcome/address` | First address after sign-up (area locked to the detected one) |
| `/search?q=` | Search shops and items |
| `/shop/:id` | Shop page |
| `/cart` | Cart (one shop at a time) |
| `/checkout` | Cash on Delivery, or UPI. Out-of-area customers use gifting mode (UPI only) |
| `/orders/:id/placed` | Success screen |
| `/orders/:id` | Tracking timeline; cancel while Pending |
| `/orders` | Active and past orders, Reorder |
| `/profile` | Area, addresses, help, logout, delete account |
| `/not-serviceable` | "My place is not listed" |

- Tracking refreshes every 15 seconds while an order is active.
- UPI cannot be verified without a payment gateway, so the customer taps "I have
  paid".
- Saved addresses stay on the phone that typed them. Each order carries its own copy.

## Rules of the codebase

| Rule | Where |
| --- | --- |
| Brand colours, spacing, fonts, radius, motion | `src/styles/variables.css` only |
| Every UI string | `src/i18n/en.js`, used via `t('key')` |
| Data access | `src/services/*.js` (async). Screens never call `src/services/api/` directly |
| Order statuses, storage keys | `src/utils/constants.js` |
| Delivery villages (GPS lookup) | `src/data/serviceAreas.js` |
| Money | `formatPrice()` / `<PriceTag>` (₹, en-IN) |
| Dates | `formatDate()` → DD/MM/YYYY |

## Folder structure

```
src/
  components/ui/        shared controls (Button, Input, Select, Modal, Toast, Skeleton…)
  components/layout/    OfflineBanner, ErrorBoundary, PageLoader, PageHeader, TabBar
  components/customer/  ShopCard, ProductCard, CartBar, AddressForm…
  components/location/  LocationStep
  components/brand/     MyntIcon, MyntLogo
  pages/auth/           Google sign-in
  pages/customer/       every customer screen
  context/              Settings, Auth, Location, Cart, Customer, Toast
  services/             shop, product, order, user, settings, account
  services/api/         client, mappers and one file per area
  data/                 serviceAreas.js
  i18n/                 en.js + t()
  hooks/, utils/, styles/
scripts/
  check-rules.mjs, seed-demo-shop.mjs, e2e/ (Playwright checks)
```

## Still to do

1. **Real security.** Everyone shares one API key through the proxy, so the API
   cannot yet tell one customer from another. `POST /api/auth/google` proves who
   someone is. The next step is a session token that the other endpoints check.
2. **Payments.** UPI is trust-based; a payment gateway would verify it.
3. **Saved addresses** should move to the API's `addresses` table.
4. **Confirm the village list and coordinates** in `src/data/serviceAreas.js`
   (the Rajagiri coordinates are an estimate).
