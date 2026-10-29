import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';
import * as accountService from '../services/accountService.js';
import { googleSignOut } from '../services/google.js';
import { readStorage, writeStorage, removeStorage } from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';

const AuthContext = createContext(null);

/**
 * Provides:
 *  - user: { id, name, phone, role, shopId?, partnerId?, customerId? } | null
 *  - login(role, details) → Promise<user>
 *  - logout()
 *  - updateUser(patch) — e.g. after editing profile name
 *  - signInWithGoogle(role, google) → { user } (signed in) | { needsSignUp: true }
 *  - completeSignUp(role, google, details) → user
 *  - deleteAccount() — deletes the signed-in account, then signs out
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = readStorage(STORAGE_KEYS.SESSION, null);
    return saved && saved.role ? saved : null;
  });

  const login = useCallback(async (role, details) => {
    const u = await authService.login(role, details);
    setUser(u);
    writeStorage(STORAGE_KEYS.SESSION, u);
    return u;
  }, []);

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
    await authService.logout();
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
    () => ({ user, login, logout, updateUser, signInWithGoogle, completeSignUp, deleteAccount }),
    [user, login, logout, updateUser, signInWithGoogle, completeSignUp, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
