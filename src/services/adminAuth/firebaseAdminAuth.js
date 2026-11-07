import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { emailKey } from './index.js';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** Popup errors that mean "use a redirect instead" (blocked, or not supported here). */
const USE_REDIRECT = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request']);

/** Firestore Timestamp → ISO string, so the screens deal in plain values. */
const plain = (data) =>
  Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v]));

export function createFirebaseAdminAuth() {
  const configured = Boolean(config.apiKey && config.authDomain && config.projectId);
  if (!configured) {
    const off = () => {
      throw Object.assign(new Error('Firebase is not configured'), { code: 'NOT_CONFIGURED' });
    };
    return {
      configured: false,
      onUserChanged: (cb) => {
        cb(null);
        return () => {};
      },
      signInWithGoogle: off,
      signOut: async () => {},
      getIdToken: async () => null,
      getAdminUser: off,
      touchLastLogin: async () => {},
      listAdminUsers: off,
      createAdminUser: off,
      updateAdminUser: off,
      deleteAdminUser: off,
    };
  }

  const app = initializeApp(config, 'mynt-admin');
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // Stay signed in across refreshes (the default, set explicitly).
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  // Finish a redirect sign-in started on a phone; errors surface on next sign-in.
  const redirect = getRedirectResult(auth).catch((e) => e);

  const ref = (email) => doc(db, 'adminUsers', emailKey(email));

  return {
    configured: true,
    redirectResult: redirect,

    onUserChanged(cb) {
      return onAuthStateChanged(auth, (u) =>
        cb(u ? { email: u.email, name: u.displayName, photo: u.photoURL, emailVerified: u.emailVerified } : null),
      );
    },

    async signInWithGoogle() {
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        if (USE_REDIRECT.has(e?.code)) return signInWithRedirect(auth, provider);
        throw e;
      }
      return undefined;
    },

    signOut: () => fbSignOut(auth),

    getIdToken: async () => (auth.currentUser ? auth.currentUser.getIdToken() : null),

    async getAdminUser(email) {
      const snap = await getDoc(ref(email));
      return snap.exists() ? plain(snap.data()) : null;
    },

    touchLastLogin: (email) => updateDoc(ref(email), { lastLoginAt: serverTimestamp() }).catch(() => {}),

    async listAdminUsers() {
      const snap = await getDocs(collection(db, 'adminUsers'));
      return snap.docs.map((d) => plain(d.data()));
    },

    async createAdminUser(data) {
      const existing = await getDoc(ref(data.email));
      if (existing.exists()) throw Object.assign(new Error('duplicate'), { code: 'DUPLICATE' });
      await setDoc(ref(data.email), { ...data, email: emailKey(data.email), createdAt: serverTimestamp(), lastLoginAt: null });
    },

    updateAdminUser: (email, patch) => updateDoc(ref(email), patch),

    deleteAdminUser: (email) => deleteDoc(ref(email)),
  };
}
