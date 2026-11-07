import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { emailKey, getAdminAuth, ROLES } from '../services/adminAuth/index.js';
import { setAuthTokenProvider } from '../services/api/client.js';
import { ADMIN_BASE } from '../utils/constants.js';

const AdminAuthContext = createContext(null);

/** Where each role lands after sign-in (and when it opens a page it may not see). */
export const homeFor = (role) => (role === ROLES.SHOP_OWNER ? `${ADMIN_BASE}/my-shop` : ADMIN_BASE);

/**
 * Who is signed in to the admin panel, and as what.
 *
 * Google sign-in (Firebase). Then the allowlist: adminUsers/{email}. No
 * document, or active: false → signed straight back out with "no access".
 * Checked on every load (onAuthStateChanged fires on load), and again when the
 * tab comes back to the front — so a deactivated user is out on their next
 * visit at the latest. The site's /api proxy repeats the check on every admin
 * request, so this is the convenience layer, not the lock.
 *
 * status: 'checking' | 'unconfigured' | 'signedOut' | 'denied' | 'ready'
 * admin:  { email, name, photo, role, shopId }
 */
export function AdminAuthProvider({ children }) {
  const [state, setState] = useState({ status: 'checking', admin: null, error: null });
  const api = useRef(null);

  const check = useCallback(async (user) => {
    const auth = api.current;
    if (!user) {
      setState((s) => ({ status: s.status === 'denied' ? 'denied' : 'signedOut', admin: null, error: s.status === 'denied' ? s.error : null }));
      return;
    }
    try {
      const doc = user.emailVerified === false ? null : await auth.getAdminUser(emailKey(user.email));
      if (!doc || doc.active !== true || !Object.values(ROLES).includes(doc.role) || (doc.role === ROLES.SHOP_OWNER && !doc.shopId)) {
        setState({ status: 'denied', admin: null, error: null });
        await auth.signOut();
        return;
      }
      auth.touchLastLogin(user.email);
      setState({
        status: 'ready',
        error: null,
        admin: { email: emailKey(user.email), name: user.name || user.email, photo: user.photo || null, role: doc.role, shopId: doc.shopId || null },
      });
    } catch (e) {
      // Could not read the allowlist (offline, rules): never let them in on an error.
      setState({ status: 'signedOut', admin: null, error: e?.code || 'NETWORK' });
      await auth.signOut().catch(() => {});
    }
  }, []);

  useEffect(() => {
    let off = () => {};
    let user = null;
    let alive = true;
    (async () => {
      const auth = await getAdminAuth();
      if (!alive) return;
      api.current = auth;
      if (!auth.configured) {
        setState({ status: 'unconfigured', admin: null, error: null });
        return;
      }
      setAuthTokenProvider(() => auth.getIdToken());
      off = auth.onUserChanged((u) => {
        user = u;
        check(u);
      });
    })();
    // Back to the tab: check the allowlist again (deactivated meanwhile?).
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user && api.current) check(user);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      off();
      setAuthTokenProvider(null);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  const signIn = useCallback(async () => {
    setState((s) => ({ ...s, status: s.status === 'denied' ? 'signedOut' : s.status, error: null }));
    try {
      await api.current.signInWithGoogle();
    } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setState((s) => ({ ...s, error: e?.code || 'SIGN_IN_FAILED' }));
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.current?.signOut();
    setState({ status: 'signedOut', admin: null, error: null });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
      isSuperadmin: state.admin?.role === ROLES.SUPERADMIN,
      isShopOwner: state.admin?.role === ROLES.SHOP_OWNER,
      /** The adminUsers operations, for the Access page (rules allow superadmin only). */
      access: {
        list: () => api.current.listAdminUsers(),
        create: (doc) => api.current.createAdminUser(doc),
        update: (email, patch) => api.current.updateAdminUser(email, patch),
        remove: (email) => api.current.deleteAdminUser(email),
      },
    }),
    [state, signIn, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
