# Zevio — hyperlocal food delivery (frontend only)

Swiggy-style local food delivery app for **Papanasam ↔ Ayyampettai** — **hotels and bakeries only**. Pure React + Vite, plain CSS. Runs on the **Zevio API** or on built-in demo data.

> App name **Zevio** is set in `src/i18n/en.js` (`app.name`) and in `index.html` (title + loading screen).
>
> Shop categories are set in `src/utils/constants.js` → `SHOP_CATEGORIES = ['hotels', 'bakery']`. To add a category later, add it there and give it a label in `en.js` (`categories`) and an icon in `Icons.jsx` (`CATEGORY_ICONS`).

**Language:** English only. All UI text is in `src/i18n/en.js` and read with `t('key')`, so another language can be added later without touching components.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (also on your phone via the Network URL)
npm run build      # production build in dist/
```

## Connect to the Zevio API

The app has two data modes:

| Mode | When | Data |
| --- | --- | --- |
| **Demo** (default) | no `.env.local` | built-in sample shops/orders in the browser, no server needed |
| **API** | `VITE_DATA_SOURCE=api` | the Zevio API (`zevio-apis`) |

**Local setup:** copy `.env.example` to `.env.local` and fill in the key:

```
VITE_DATA_SOURCE=api
ZEVIO_API_URL=https://zevio-apis.vercel.app     # or http://127.0.0.1:2222 for a local API
ZEVIO_API_KEY=<the API_KEY from the API's secrets.env>
```

Then `npm run dev`. The key **never goes to the browser**: the app calls `/api/...` on its own address, and the dev server forwards the call with `X-API-Key` (see `vite.config.js`). This also avoids CORS.

**Netlify:** `netlify.toml` already sets `VITE_DATA_SOURCE=api` and `netlify/edge-functions/api.js` does the forwarding. In Netlify → Site configuration → Environment variables, add `ZEVIO_API_URL` and `ZEVIO_API_KEY`. The edge function only lets through the endpoints the app uses.

**What uses the API now**

- Customer: login (creates a profile), shops, menus, search, cart → place order, my orders, tracking, cancel.
- Shop panel: login, new orders, accept / ready / reject, products (add, edit, price, in-stock, delete), open/closed, settings.
- Admin: dashboard, orders, shops (add, edit, active on/off).

**Still on demo data** (the API has no endpoints for these yet): delivery partner app, partner assignment, admin customers/partners lists, saved addresses (kept on the phone), platform settings (delivery fee, places, platform UPI).

Some fields have no column in the API yet (shop category, UPI ID, timings, veg/non-veg, payment method, instructions…). For now they are saved inside the description and address text, so every phone sees them. The exact fixes and columns the backend needs are in **[BACKEND-CHANGES.md](BACKEND-CHANGES.md)**. Two bugs there (ids of new shops/products) must be fixed before shop owners can add products.

Code: `src/services/api/` (client, mappers, API calls). Screens did not change: each service function picks the API or the demo data (API records have UUID ids, demo ones have short ids like `s1`).

## Order statuses (same as the API README)

`Pending → Confirmed → Preparing → Out for delivery → Delivered`, or `Cancelled`.
Shop: Accept = Confirmed, Start preparing = Preparing, Reject = Cancelled (with a reason). Partner: Picked up = Out for delivery.
The app sends these to the API as-is (`pending`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`).

## Sign in, sign up, log out, delete account

Customers, shop owners and delivery partners use **one sign-in screen** (shown on `/`, `/shop-panel` and `/delivery` when not signed in):

1. **Who are you?** — Customer / Shop owner / Delivery partner (the section you opened is pre-selected).
2. **Continue with Google** — the only way to sign in. No passwords, no phone OTP.
3. **First time only** — a short sign-up form:
   - Customer: name (from Google) + mobile number.
   - Shop owner: owner name, mobile, shop name, type (hotel/bakery), place, address, UPI ID. The shop starts **switched off and closed**; the owner sees "Waiting for approval" until the admin turns it on (Admin → Shops → Active).
   - Delivery partner: name, mobile, vehicle number, base place. Starts **switched off**; cannot go online until the admin turns it on (Admin → Delivery partners).
4. **Log out** — Profile (customer), Shop → Settings (shop owner), Account (partner).
5. **Delete account** — same pages, under the log-out button. The person must type `DELETE`. It is refused while they have orders in progress. Past orders are kept for the shop/platform accounts.

**Google sign-in setup:** without `VITE_GOOGLE_CLIENT_ID` a *demo* Google account chooser appears (pick a demo person or "Use another account"). For real Google sign-in, create an OAuth client ID (Web application) in Google Cloud Console → APIs & Services → Credentials, add `http://localhost:5173` and your Netlify address to *Authorized JavaScript origins*, and put the ID in `.env.local` / Netlify as `VITE_GOOGLE_CLIENT_ID`.

With the API, the same Google account always maps to the same profile id, so a customer gets the same account on any phone; shop owners are found by their profile or by the shop's email. The admin panel keeps its own login at `/admin`.

## Phase status

- [x] **Phase 1** — setup, CSS variables, contexts, English text system, services + mock data, reusable UI components
- [x] **Phase 2** — Customer app
- [x] **Phase 3** — Shop panel
- [x] **Phase 4** — Delivery partner app
- [x] **Phase 5** — Admin panel
- [x] **Phase 6** — Performance & polish

## Testing in dev

- A small dark **`</>`** tab (right edge, middle of the screen) switches role: Customer / Shop / Delivery / Admin, resets demo data and opens the **UI kit** at `/dev/ui`.
- The UI kit shows every component plus loading, empty and error states. "Simulate error" makes the next service call fail.
- Mock data is saved in localStorage (`zevio.mockdb`), so an order placed as a customer is still there when you switch to the shop role. Use "Reset demo data" to start fresh.

## Customer app (Phase 2)

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

- Sign-in: see "Sign in, sign up, log out, delete account" above.
- In dev, the tracking page moves the order to the next status every 5 seconds (toggle on the page).
- UPI payments cannot be verified without a backend, so the user taps "I have paid".

## Shop panel (Phase 3)

| Route | Screen |
| --- | --- |
| `/shop-panel` | Sign in with Google, then dashboard — big Open/Closed switch, today's orders & sales, tabs New / Confirmed / Preparing / Completed |
| `/shop-panel/orders/:id` | Order detail — items, customer, landmark, payment; Accept / Reject (reason) / Mark as ready |
| `/shop-panel/products` | Products — search, quick in-stock switch, edit |
| `/shop-panel/products/new`, `/:id` | Add / edit product — name, price, menu section, veg/non-veg, photo preview, delete |
| `/shop-panel/settings` | Timings, phone, UPI ID, photo preview, subscription card, logout |

- The panel checks for new orders every 8 seconds. A new order plays a double beep, vibrates the phone, shows a toast and a red **NEW** card. Sound only works after the owner has tapped the screen once (browser rule).
- Subscription banner: red when expired, amber when 7 days or less are left (try shop "New Royal Bakes & Sweets" — expired, or "Kaveri Tiffin Centre" — ending soon).
- DEV: "simulate a new order" button at the bottom of the dashboard.
- Testing tip: open the customer app in one tab and the shop panel in another — tabs share the demo data, so the shop rings when the customer orders. (Both tabs share one login, so log in again after switching roles.)
- Photos are preview only for now; nothing is uploaded.

## Delivery partner app (Phase 4)

| Route | Screen |
| --- | --- |
| `/delivery` | Sign in with Google, then home — big Online/Offline switch, today's summary (delivered, earnings, cash to hand over), assigned orders |
| `/delivery/orders/:id` | Order — "Collect ₹X" (COD) or "Paid online", PICKUP (shop, call) and DROP (customer, landmark, call), items; Picked up → Delivered with confirm |
| `/delivery/history` | Past orders grouped by date with daily totals |
| `/delivery/account` | Partner details, call support, logout (sets Offline) |

- Orders reach a partner when the admin assigns them (Phase 5). Until then use the DEV button "assign me an order" on the delivery home, or the customer tracking page's auto-progress, which assigns an online partner when the order is Preparing.
- "Picked up" works only once the shop has marked the order Preparing.
- Earnings = delivered orders × per-order incentive (Settings, default ₹10). Cash to hand over = COD totals delivered today.
- A newly assigned order beeps and vibrates, like the shop panel.

## Admin panel (Phase 5)

Desktop-first with a sidebar; on phones the sidebar becomes a ☰ menu and tables scroll sideways inside their box.

| Route | Screen |
| --- | --- |
| `/admin` | Login (any password), then dashboard — today's orders, delivered, cancelled, delivery-fee revenue, active shops, partners online, orders needing a partner; 7-day bar chart (plain divs); recent orders |
| `/admin/orders` | Table with filters (status, shop, place, date, "only without partner") and search. Click an order → drawer with details, **assign / reassign partner**, **manual status change** (with confirm), timeline. `?open=<id>` opens a drawer directly |
| `/admin/shops` | Table, add/edit drawer (details, category Hotels / Bakery, timings, UPI, photo preview, **subscription plan / status / start / end**), activate / deactivate switch |
| `/admin/partners` | List with online status and today's deliveries, add / edit, activate / deactivate (deactivating also sets Offline) |
| `/admin/customers` | List with order count, search, block / unblock (blocked customers cannot log in or order) |
| `/admin/settings` | Delivery fee, partner incentive, support phone / WhatsApp, platform UPI ID + name, **service area places** (add, rename, remove — a place with shops cannot be removed) |

- The dashboard refreshes every 30 seconds; the partners page every 20 seconds.
- Settings changes apply everywhere at once (customer bill, address forms, partner earnings).

## Performance & quality (Phase 6)

Measured on the production build with Chrome throttled to **"Fast 3G" + 4× slower CPU** (≈ a cheap Android phone), 360 px wide:

| | Before | After |
| --- | --- | --- |
| First thing on screen | 3.0 s | **1.4 s** |
| Files downloaded on first visit | 13–20 | **7–8** |
| Total download (customer home) | 110 KB | 109 KB |
| Layout shift (CLS) | 0 | 0 |

What changed:
- **Instant loading screen** written in `index.html`, so something appears as soon as the HTML arrives.
- **Fewer files**: shared code is merged into one `common` file; React + router sit in a `vendor` file that stays cached across app updates.
- **Customer section and demo data preloaded** next to the main file (`vite.config.js` plugin) — saves a network round trip.
- **Demo data lazy-loaded** (`services/request.js` → `db.js`), so it is not in the first download.
- **Font doesn't block** the first paint (system font shows until Inter arrives).
- **Crash screen** (`ErrorBoundary`): a crash or a dropped download shows "Reload app" instead of a blank page; section downloads retry once automatically.
- **Accessibility**: axe-core (WCAG 2.1 AA) check of 19 screens across all roles — 0 violations. Greyed-out items (closed shops, out of stock) keep readable text contrast.
- **Production build** has no DEV tools (role switcher, UI kit, simulate/assign buttons, auto-progress).

The remaining wait to real content is mostly the **fake 300–600 ms delay** in the mock services; a real backend will have its own latency instead.

**Browsers:** Android Chrome / WebView 88+ (2021) and recent iOS Safari. Older phones need a Chrome update.

## Before going live (not in this frontend)

1. **Backend** — connected to the Zevio API (see above). The remaining gaps are listed in `BACKEND-CHANGES.md`.
2. **Real login** — Google sign-in is in the app; the backend must still verify the Google ID token and enforce who can change what (BACKEND-CHANGES.md). Admin login is still a demo.
3. **Payments** — UPI "I have paid" is trust-based. Add shop/admin confirmation of UPI payments, or a payment gateway later.
4. **New-order alerts** — polling every 8–10 s only works while the page is open; real-time listeners (Firestore `onSnapshot`) and later push notifications (out of scope now).
5. **Photos** — product/shop photos are preview-only; add Firebase Storage + image compression.
6. **Hosting** — for **Netlify** it is ready (`netlify.toml`): set `ZEVIO_API_URL` + `ZEVIO_API_KEY` in Netlify — `public/_redirects` already sends every path to `index.html`, so `/shop-panel`, `/admin` etc. work on refresh. (Firebase Hosting: add the same rewrite in `firebase.json`.)
7. **Data to fill in** — real village list (Admin → Settings), support phone/WhatsApp, platform UPI ID, real hotels / bakeries and their menus.

## Rules of the codebase

| Rule | Where |
| --- | --- |
| Brand colours, spacing, fonts, radius | `src/styles/variables.css` only |
| Every UI string | `src/i18n/en.js`, used via `t('key')` |
| Data access | `src/services/*.js` (async). Components never import `src/data/` |
| Order statuses, roles, storage keys | `src/utils/constants.js` |
| Money | `formatPrice()` / `<PriceTag>` (₹, en-IN) |
| Dates | `formatDate()` → DD/MM/YYYY |

### Changing the backend

Only `src/services/` changes. Each function keeps its name, arguments and return shape. API field mapping lives in `src/services/api/mappers.js`.

## Folder structure

```
src/
  components/ui/       Button, Input, Select, Card, Badge, BottomSheet, Modal, Toast, Skeleton,
                       EmptyState, ErrorState, StatusTimeline, PriceTag, QuantityStepper, Toggle,
                       VegDot, SmartImage, Spinner, ConfirmDialog, Drawer
  components/layout/   OfflineBanner, ErrorBoundary, DevRoleSwitcher, PageLoader, PageHeader, TabBar
  components/customer/ customer-only pieces (ShopCard, ProductCard, CartBar, AddressForm…)
  components/shop/     shop-panel pieces (ShopOrderCard, ShopTabBar, SubscriptionBanner)
  components/delivery/ delivery pieces (DeliveryOrderCard, DeliveryTabBar)
  components/admin/    admin pieces (AdminLayout, DataTable, StatCard, BarChart, AdminOrderDrawer, ShopFormDrawer)
  components/icons/    Inline SVG icons
  pages/{customer,shop,delivery,admin}/   one lazy-loaded section per role
  pages/dev/           UiKit (dev only)
  context/             Settings, Auth, Cart (useReducer), Toast, Customer, ShopPanel, Delivery
  services/            shop, product, order, user, settings, auth (mock)
  data/                mock shops, products, users, orders, settings
  i18n/                en.js + t()
  hooks/               useAsync, useOnlineStatus, useOverlay, useDebounce, useAddToCart
  utils/               constants, format, storage, mock helpers, links (tel/WhatsApp/UPI), alerts (beep/vibrate), orders (cash/delivered helpers)
  styles/              variables.css, global.css, page.module.css, login.module.css
```

## Open items

- **Service area list** — `src/data/settings.js` has Papanasam, Rajagiri, Pandaravadai, Pasupathikoil, Ayyampettai. Confirm/extend the exact villages.
- Support phone/WhatsApp and platform UPI ID in `src/data/settings.js` are fake placeholders.
