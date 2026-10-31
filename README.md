# Zevio — hyperlocal food delivery

Swiggy-style food delivery for **Papanasam ↔ Ayyampettai** — **hotels and bakeries only**.
React + Vite, plain CSS, English only. Every screen runs on the **Zevio API**
(`zevio-apis`); there is no demo or offline data in the app.

> App name: `src/i18n/en.js` (`app.name`) and `index.html`.
> Shop categories: `src/utils/constants.js` → `SHOP_CATEGORIES = ['hotels', 'bakery']`.
> Every UI string is in `src/i18n/en.js`, read with `t('key')`.

## Before it runs

| | Where | Why |
| --- | --- | --- |
| **API deployed** | `zevio-apis` on Vercel | all data |
| **`migration.sql` run once** | Supabase → SQL Editor | tables and columns this app needs, and the admin account |
| **`API_KEY`** | Vercel (API project) **and** `.env.local` here | the app's proxy adds it to every call |
| **Google OAuth client id** | Google Cloud → Credentials | the only way customers, shops and partners sign in |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (and on your phone via the Network URL)
npm run build      # production build in dist/
```

Copy `.env.example` to `.env.local`:

```
ZEVIO_API_URL=https://zevio-apis.vercel.app
ZEVIO_API_KEY=<the API_KEY from the API project>
VITE_GOOGLE_CLIENT_ID=<your Google OAuth client id>
VITE_ADMIN_PATH=                 # optional: serve the admin panel somewhere less obvious
```

The API key **never reaches the browser**: the app calls `/api/...` on its own
address and a proxy adds `X-API-Key` — `vite.config.js` while developing,
`api/[...path].js` (a Vercel function) once deployed. The proxy forwards only
the endpoints the app uses, so a stray path cannot reach the rest of the API.

**Deploying (Vercel):** `vercel.json` builds with Vite and sends every other path
to `index.html`, so `/shop-panel` and the admin panel survive a refresh. In
Vercel → Settings → Environment Variables add `ZEVIO_API_URL`, `ZEVIO_API_KEY`,
`VITE_GOOGLE_CLIENT_ID` (and `VITE_ADMIN_PATH` if you use it), then deploy.

## Who signs in, and how

| Section | Address | Sign-in |
| --- | --- | --- |
| Customer app | `/` | Google |
| Shop panel | `/shop-panel` | Google (the owner's account, or the email on the shop) |
| Delivery partner app | `/delivery` | Google |
| Admin panel | `/admin` (or `VITE_ADMIN_PATH`) | email + password, checked by the API |

Customers, shop owners and partners share one screen: **who are you** →
**Continue with Google** → a short form the first time. New **shops and delivery
partners start switched off** until the admin approves them (Admin → Shops /
Delivery partners); customers can order straight away.

The admin account comes from `migration.sql` — the password is in the API's
README, which also shows how to change it. More admins:
`POST /api/admin/add/` with the API key (not reachable from the website).

**Log out / delete account:** customer → Profile; shop owner → Shop → Settings;
partner → Account. Deleting is refused while an order is still in progress.

## Order statuses

`Pending → Confirmed → Preparing → Out for delivery → Delivered`, or `Cancelled`.
Shop: Accept = Confirmed, Start preparing = Preparing, Reject = Cancelled (with a
reason). Partner: Picked up = Out for delivery, then Delivered. The API records
the time of every step, so each phone shows the same timeline.

## Customer app

| Route | Screen |
| --- | --- |
| `/` | Home — address chip, search bar, category chips (All / Hotels / Bakery), shops (closed shops greyed at the bottom) |
| `/search?q=` | Search shops and items |
| `/shop/:id` | Shop page — info, timings, search inside shop, items grouped by section |
| `/cart` | Cart — one shop only, steppers, instructions, address, bill |
| `/checkout` | Payment — Cash on Delivery, or UPI in 2 steps (items → shop UPI, delivery fee → platform UPI) |
| `/orders/:id/placed` | Success screen, auto-opens tracking |
| `/orders/:id` | Tracking — timeline, call shop/partner, cancel while PLACED |
| `/orders` | Active + past orders, Reorder |
| `/profile` | Addresses, help (WhatsApp/call), about, logout |
| `/not-serviceable` | Shown when "My place is not listed" is picked |

- Tracking refreshes every 15 seconds while an order is active.
- UPI cannot be verified without a payment gateway, so the customer taps "I have
  paid" and the order is recorded as paid. Cash on Delivery is marked paid on delivery.
- Saved addresses stay on the phone that typed them (the order itself carries a
  copy, so history is never affected).

## Shop panel

| Route | Screen |
| --- | --- |
| `/shop-panel` | Sign in with Google, then dashboard — big Open/Closed switch, today's orders & sales, tabs New / Confirmed / Preparing / Completed |
| `/shop-panel/orders/:id` | Order detail — items, customer, landmark, payment; Accept / Reject (reason) / Mark as ready |
| `/shop-panel/products` | Products — search, quick in-stock switch, edit |
| `/shop-panel/products/new`, `/:id` | Add / edit product — name, price, menu section, veg/non-veg, photo preview, delete |
| `/shop-panel/settings` | Timings, phone, UPI ID, photo preview, subscription card, logout |

- The panel checks for new orders every 8 seconds. A new order plays a double beep, vibrates the phone, shows a toast and a red **NEW** card. Sound only works after the owner has tapped the screen once (browser rule).
- Subscription banner: red when expired, amber when 7 days or less are left. The
  admin sets the plan and dates in Admin → Shops.
- Photos are preview only for now; nothing is uploaded (see "Still to do").

## Delivery partner app

| Route | Screen |
| --- | --- |
| `/delivery` | Sign in with Google, then home — big Online/Offline switch, today's summary (delivered, earnings, cash to hand over), assigned orders |
| `/delivery/orders/:id` | Order — "Collect ₹X" (COD) or "Paid online", PICKUP (shop, call) and DROP (customer, landmark, call), items; Picked up → Delivered with confirm |
| `/delivery/history` | Past orders grouped by date with daily totals |
| `/delivery/account` | Partner details, call support, logout (sets Offline) |

- Orders reach a partner when the admin assigns them (Admin → Orders → open an
  order → assign).
- "Picked up" works only once the shop has marked the order Preparing.
- Earnings = delivered orders × per-order incentive (Settings, default ₹10). Cash to hand over = COD totals delivered today.
- A newly assigned order beeps and vibrates, like the shop panel.

## Admin panel

Desktop-first with a sidebar; on phones the sidebar becomes a ☰ menu and tables scroll sideways inside their box.

| Route | Screen |
| --- | --- |
| `/admin` | Email + password sign-in, then dashboard — today's orders, delivered, cancelled, delivery-fee revenue, active shops, partners online, orders needing a partner; 7-day bar chart (plain divs); recent orders |
| `/admin/orders` | Table with filters (status, shop, place, date, "only without partner") and search. Click an order → drawer with details, **assign / reassign partner**, **manual status change** (with confirm), timeline. `?open=<id>` opens a drawer directly |
| `/admin/shops` | Table, add/edit drawer (details, category Hotels / Bakery, timings, UPI, photo preview, **subscription plan / status / start / end**), activate / deactivate switch |
| `/admin/partners` | List with online status and today's deliveries, add / edit, activate / deactivate (deactivating also sets Offline). A partner added here signs in with the Google address you enter. |
| `/admin/customers` | List with order count, search, block / unblock (blocked customers cannot log in or order) |
| `/admin/settings` | Delivery fee, partner incentive, support phone / WhatsApp, platform UPI ID + name, **service area places** (add, rename, remove — a place with shops cannot be removed) |

- The dashboard refreshes every 30 seconds; the partners page every 20 seconds.
- Settings live in the API, so a change reaches every phone (customer bill,
  address forms, partner earnings).

## Speed on a cheap phone

Measured on the production build with Chrome throttled to **"Fast 3G" + 4× slower
CPU**, 360 px wide: first paint **1.4 s**, 7–8 files on the first visit, no layout shift.

- **Instant loading screen** in `index.html`, so something appears as soon as the HTML arrives.
- **Few files**: shared code in one `common` file; React + router in a `vendor` file
  that stays cached between app updates; one lazy chunk per role, so customers
  never download the admin panel.
- **Customer section preloaded** next to the main file (`vite.config.js` plugin).
- **Font doesn't block** the first paint (system font until Inter arrives).
- **Crash screen** (`ErrorBoundary`) instead of a blank page; a dropped chunk retries once.
- **Accessibility**: axe-core (WCAG 2.1 AA) across 19 screens — 0 violations.

**Browsers:** Android Chrome / WebView 88+ (2021) and recent iOS Safari.

## Still to do

1. **Real security.** Everyone shares one API key through the proxy, so the API
   cannot yet tell one person from another. `POST /api/auth/google` proves who
   someone is; the next step is a session token the other endpoints check, so a
   shop owner can only change their own shop. The admin path (`VITE_ADMIN_PATH`)
   hides the panel, it does not protect it — the password and the API's own
   checks do. See `BACKEND-CHANGES.md`.
2. **Payments.** UPI is trust-based ("I have paid"). Add shop/admin confirmation
   or a payment gateway.
3. **New-order alerts.** Polling every 8–10 s only works while the page is open;
   push notifications would be the next step.
4. **Photos.** Shop and product photos are preview-only; nothing is uploaded yet.
5. **Saved addresses** stay on one phone until the app uses the API's `addresses`
   table (the endpoints already exist).
6. **Fill in the real data.** Admin → Settings: villages, delivery fee, partner
   incentive, support phone / WhatsApp and the platform UPI id. Then approve your
   first shops.

## Rules of the codebase

| Rule | Where |
| --- | --- |
| Brand colours, spacing, fonts, radius | `src/styles/variables.css` only |
| Every UI string | `src/i18n/en.js`, used via `t('key')` |
| Data access | `src/services/*.js` (async). Screens never call `src/services/api/` directly |
| Order statuses, roles, storage keys | `src/utils/constants.js` |
| Money | `formatPrice()` / `<PriceTag>` (₹, en-IN) |
| Dates | `formatDate()` → DD/MM/YYYY |

### Changing the backend

Only `src/services/` changes. Each function keeps its name, arguments and return
shape. `src/services/api/` holds the client, the calls and `mappers.js`, which
turns API records into the shapes screens use — when the API gains a column,
usually only `mappers.js` changes.

## Folder structure

```
src/
  components/ui/       Button, Input, Select, Card, Badge, BottomSheet, Modal, Toast, Skeleton,
                       EmptyState, ErrorState, StatusTimeline, PriceTag, QuantityStepper, Toggle,
                       VegDot, SmartImage, Spinner, ConfirmDialog, Drawer
  components/layout/   OfflineBanner, ErrorBoundary, PageLoader, PageHeader, TabBar
  components/customer/ customer-only pieces (ShopCard, ProductCard, CartBar, AddressForm…)
  components/shop/     shop-panel pieces (ShopOrderCard, ShopTabBar, SubscriptionBanner)
  components/delivery/ delivery pieces (DeliveryOrderCard, DeliveryTabBar)
  components/admin/    admin pieces (AdminLayout, DataTable, StatCard, BarChart, AdminOrderDrawer, ShopFormDrawer)
  components/icons/    Inline SVG icons
  pages/auth/          one sign-in screen for customers, shops and partners
  pages/{customer,shop,delivery,admin}/   one lazy-loaded section per role
  context/             Settings, Auth, Cart (useReducer), Toast, Customer, ShopPanel, Delivery
  services/            shop, product, order, user, settings, account, auth — all screens use these
  services/api/        client, mappers and one file per area (shops, orders, users,
                       account, settings, auth); addressBook.js keeps addresses on the phone
  i18n/                en.js + t()
  hooks/               useAsync, useOnlineStatus, useOverlay, useDebounce, useAddToCart
  utils/               constants, format, storage, errors, links (tel/WhatsApp/UPI), alerts (beep/vibrate), orders (cash/delivered helpers)
  styles/              variables.css, global.css, page.module.css, login.module.css
```

## Open items

- **Confirm the village list** in Admin → Settings (it starts as Papanasam,
  Rajagiri, Pandaravadai, Pasupathikoil, Ayyampettai).
- **Support phone / WhatsApp and the platform UPI id** must be set in
  Admin → Settings before launch; until then the help buttons and the UPI step
  have nothing to point at.
