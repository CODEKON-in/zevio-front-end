# Mynt admin panel — Google sign-in, invite only

The admin panel (`/admin`, or your `VITE_ADMIN_PATH`) has one button: **Continue with Google**.
Only Gmail addresses on the allowlist get in. Two roles:

| Role | Can do |
|---|---|
| `superadmin` | Everything, including **Access** (invite / deactivate / remove people) |
| `shop_owner` | Only their own shop: menu, orders, shop details, open/closed |

How it is enforced, three layers:

1. **Screens** — `AdminAuthContext` reads `adminUsers/{email}` after sign-in; not found or
   `active: false` → signed out with "You don't have access…". Route guards and the sidebar
   follow the role.
2. **Firestore rules** (`firestore.rules`) — the allowlist itself: a user can read only their
   own entry; only an active superadmin can read the list or invite, change or remove anyone;
   a superadmin can't remove, deactivate or demote themself.
3. **The site's `/api` proxy** (`api/_adminGuard.js`) — your shops, products and orders live
   in Supabase behind the Flask API, so Firestore rules can't protect them. The proxy does:
   every admin-only call must carry the admin's Firebase ID token; the proxy verifies it
   (Google's signing keys, your project, not expired, email verified), reads the caller's
   `adminUsers` entry, and lets a shop owner touch **only their own shop** (it looks up the
   shop of a product or order). Customer calls are unchanged.

---

## One-time setup

### 1. Create the Firebase project
1. <https://console.firebase.google.com> → **Add project** → name it `mynt` (Google Analytics: off is fine).
   You can also pick your existing Google Cloud project (the one your Google sign-in client lives in).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**, choose a support email, **Save**.
3. **Authentication → Settings → Authorized domains → Add domain**:
   - `localhost` (usually already there)
   - `zevio-shop.vercel.app` (and any custom domain you add later)
4. **Build → Firestore Database → Create database** → production mode → region `asia-south1` (Mumbai).

### 2. Put the config in the app
**Project settings (⚙) → General → Your apps → Add app → Web (`</>`)** → register (no hosting).
Copy these four values from the config it shows into **`.env.local`** (and into Vercel →
Settings → Environment Variables, then redeploy):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=...
```

And on **Vercel only** (server side, for the proxy check):

```
FIREBASE_PROJECT_ID=your-project
```

Without `FIREBASE_PROJECT_ID` the proxy refuses every admin call (it fails closed).

### 3. Publish the security rules
Either paste `firestore.rules` into **Firestore → Rules → Publish**, or with the CLI:

```
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project your-project
```

### 4. Seed the superadmin (once, in the console — never from the app)
**Firestore → Data → Start collection**
- Collection ID: `adminUsers`
- Document ID: `waheedx212@gmail.com`  ← exactly, lowercase
- Fields:

| Field | Type | Value |
|---|---|---|
| `email` | string | `waheedx212@gmail.com` |
| `role` | string | `superadmin` |
| `active` | boolean | `true` |
| `invitedBy` | string | `seed` |
| `createdAt` | timestamp | now |
| `lastLoginAt` | null | |

The console can write it even though the rules block everyone else — rules don't apply in the console.

### 5. Try it
Open `/admin` → **Continue with Google** → sign in as waheedx212@gmail.com → you land on the
dashboard. Go to **Access** → invite a shop owner (their Gmail + their shop). They open
`/admin`, sign in with that Gmail, and see only **My shop** and **Orders**.

---

## Everyday
- **Invite**: Access → Gmail address, role, shop (for a shop owner) → Send invite.
  They must sign in with that exact Gmail.
- **Take access away**: Deactivate (keeps the entry) or Remove. They are out on their next
  page load; the proxy stops their admin calls within 30 seconds.
- **Move an owner to another shop**: change the Shop dropdown in their row.

## Testing
- Proxy check (offline, real signed tokens): `npm run test:admin-guard`
- Firestore rules (needs Java; downloads the emulator once):
  ```
  npm i -D firebase-tools @firebase/rules-unit-testing
  npx firebase emulators:exec --only firestore --project demo-mynt "node tests/firestore-rules.test.mjs"
  ```
- Screens without Firebase: put `VITE_ADMIN_AUTH_FAKE=true` in `.env.local`, run `npm run dev`;
  "Continue with Google" then asks for an email in a prompt (development builds only).

## Not covered here
The **customer** calls through the proxy are still open the way they were before
(placing orders, reading an order by id, editing a profile): customers sign in with Google
on the page, but the API does not check that sign-in. Securing those is a separate job.
