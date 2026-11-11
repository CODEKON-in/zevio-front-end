import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  loginWithGoogle,
  logoutUser,
  subscribeToAuthState,
} from '../services/authService';

const SellerAuthContext = createContext(null);

const DEV_STORAGE_KEY = 'mynt_dev_guest_session';

export function SellerAuthProvider({ children }) {
  const isDevAllowed = Boolean(
    import.meta.env.DEV || import.meta.env.VITE_ALLOW_GUEST === 'true'
  );

  const [user, setUser] = useState(() => {
    if (isDevAllowed) {
      try {
        const saved = sessionStorage.getItem(DEV_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse dev session:', e);
      }
    }
    return null;
  });

  const [seller, setSeller] = useState(() => user);
  const [loading, setLoading] = useState(() => (user ? false : true));
  const [error, setError] = useState(null);

  useEffect(() => {
    // If running in active dev guest bypass, do not overwrite with Firebase onAuthStateChanged
    if (isDevAllowed && user?.isGuest) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToAuthState(({ user: fbUser, seller: fbSeller, loading: l, error: err }) => {
      // Re-verify we aren't in guest mode before overwriting
      if (isDevAllowed) {
        const saved = sessionStorage.getItem(DEV_STORAGE_KEY);
        if (saved) return;
      }

      setUser(fbUser);
      setSeller(fbSeller);
      setLoading(l);
      if (err) {
        setError(err);
      }
    });

    return () => unsubscribe();
  }, [isDevAllowed, user?.isGuest]);

  const handleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      const sellerData = await loginWithGoogle();
      setUser(sellerData);
      setSeller(sellerData);
      setLoading(false);
      return sellerData;
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Login failed. Please try again.');
      throw err;
    }
  };

  /**
   * DEV-ONLY guest login bypass
   * Strictly blocked if isDevAllowed is false
   */
  const loginAsDevGuest = (customShopId) => {
    if (!isDevAllowed) {
      throw new Error('Guest login is strictly prohibited in production mode.');
    }

    const targetShopId = (
      customShopId ||
      import.meta.env.VITE_DEV_SHOP_ID ||
      'shop_ayyampettai_01'
    ).trim();

    const guestSession = {
      email: 'test@mynt.dev',
      name: 'Test Seller',
      photo: '',
      shopId: targetShopId,
      isGuest: true,
    };

    try {
      sessionStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(guestSession));
    } catch (e) {
      console.warn('Could not save guest session to storage:', e);
    }

    setError(null);
    setUser(guestSession);
    setSeller(guestSession);
    setLoading(false);
    return guestSession;
  };

  const handleLogout = async () => {
    try {
      if (isDevAllowed) {
        sessionStorage.removeItem(DEV_STORAGE_KEY);
      }
      await logoutUser();
      setUser(null);
      setSeller(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value = {
    user,
    seller,
    loading,
    error,
    setError,
    handleLogin,
    handleLogout,
    loginAsDevGuest,
    isDevAllowed,
  };

  return (
    <SellerAuthContext.Provider value={value}>
      {children}
    </SellerAuthContext.Provider>
  );
}

export function useSellerAuth() {
  const context = useContext(SellerAuthContext);
  if (!context) {
    throw new Error('useSellerAuth must be used within a SellerAuthProvider');
  }
  return context;
}
