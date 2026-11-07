/**
 * Admin sign-in: Google through Firebase Authentication, with the allowlist
 * (who may enter, and as what) in Firestore → adminUsers/{email}.
 *
 * Everything the admin panel needs goes through this one small interface, so
 * the screens never import Firebase directly:
 *
 *   configured                 Firebase settings present (VITE_FIREBASE_*)
 *   onUserChanged(cb)          cb(googleUser | null); returns unsubscribe
 *   signInWithGoogle()         popup, or a full-page redirect if the popup is blocked
 *   signOut()
 *   getIdToken()               the signed-in user's Firebase ID token (for /api)
 *   getAdminUser(email)        adminUsers doc or null
 *   touchLastLogin(email)
 *   listAdminUsers()           superadmin only (Firestore rules enforce it)
 *   createAdminUser(doc)       throws { code: 'DUPLICATE' } if the email exists
 *   updateAdminUser(email, patch)
 *   deleteAdminUser(email)
 *
 * In `npm run dev` with VITE_ADMIN_AUTH_FAKE=true a local stand-in is used
 * instead (no Google, no Firebase), for trying the screens. It cannot be
 * switched on in a production build.
 */
const FAKE = Boolean(import.meta.env.DEV) && import.meta.env.VITE_ADMIN_AUTH_FAKE === 'true';

let instance = null;

export async function getAdminAuth() {
  if (!instance) {
    instance = FAKE ? (await import('./fakeAdminAuth.js')).createFakeAdminAuth() : (await import('./firebaseAdminAuth.js')).createFirebaseAdminAuth();
  }
  return instance;
}

export const ROLES = Object.freeze({ SUPERADMIN: 'superadmin', SHOP_OWNER: 'shop_owner' });

/** Document ids are the lowercased email. */
export const emailKey = (email) => String(email || '').trim().toLowerCase();
