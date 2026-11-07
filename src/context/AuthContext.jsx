import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as accountService from '../services/accountService.js';
import { googleSignOut } from '../services/google.js';
import { readStorage, writeStorage, removeStorage } from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';

const AuthContext = createContext(null);

/**
 * Provides:
 *  - user: { id, name, phone, role, customerId } | null (customers only)
 *  - logout()
 *  - updateUser(patch) — e.g. after editing profile name
 *  - signInWithGoogle(role, google) → { user } (signed in) | { needsSignUp: true }
 *  - completeSignUp(role, google, details) → user
 *  - deleteAccount() — deletes the signed-in account, then signs out
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = readStorage(STORAGE_KEYS.SESSION, null);
    // Only customer sessions count (an old admin session from before is ignored).
    return saved && saved.role === 'customer' ? saved : null;
  });

  const saveSession = useCallback((u) => {
    setUser(u);
    writeStorage(STORAGE_KEYS.SESSION, u);
    return u;
  }, []);

  const signInWithGoogle = useCallback(
    async (role, google) => {
      const result = await accountService.signInWithGoogle(role, google);
      if (result.user) saveSession(result.user);
      return result;
    },
    [saveSession],
  );

  const completeSignUp = useCallback(
    async (role, google, details) => saveSession(await accountService.completeSignUp(role, google, details)),
    [saveSession],
  );

  const logout = useCallback(async () => {
    googleSignOut();
    setUser(null);
    removeStorage(STORAGE_KEYS.SESSION);
  }, []);

  const deleteAccount = useCallback(async () => {
    await accountService.deleteAccount(user);
    googleSignOut();
    setUser(null);
    removeStorage(STORAGE_KEYS.SESSION);
    removeStorage(STORAGE_KEYS.CART);
  }, [user]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeStorage(STORAGE_KEYS.SESSION, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, logout, updateUser, signInWithGoogle, completeSignUp, deleteAccount }),
    [user, logout, updateUser, signInWithGoogle, completeSignUp, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
