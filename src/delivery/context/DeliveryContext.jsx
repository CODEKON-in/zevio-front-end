import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  subscribeToAuthSession,
  signInWithGoogle as signInWithGoogleService,
  completeGoogleRedirectSignIn,
  signOutFromGoogle,
  mapAuthError,
  isFirebaseConfigured
} from '../services/authService';
import {
  getAllOrdersForPartner,
  syncOrdersWithBackend,
  updateOrderStatusInStore,
  reportOrderIssueInStore,
  syncDutyStatusWithBackend,
  resetDemoOrders
} from '../services/deliveryService';
import { ORDER_STATUS_CONFIG, DELIVERY_PAYOUT_PER_ORDER } from '../data/mockData';
import { isToday, isThisWeek } from '../utils/dateUtils';

const DeliveryContext = createContext(null);
const DUTY_STATUS_KEY = 'mynt_dp_duty_status_v1';

export function DeliveryProvider({ children }) {
  // Auth state machine:
  // 'checking' -> verifying existing session on mount / refresh
  // 'unauthenticated' -> ready to sign in with Google
  // 'signing_in' -> Google OAuth popup/redirect in progress
  // 'authenticated' -> verified Google session active (single source of truth: onAuthStateChanged)
  const [authStatus, setAuthStatus] = useState('checking');
  const [partner, setPartner] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isOnDuty, setIsOnDuty] = useState(() => {
    try {
      const saved = localStorage.getItem(DUTY_STATUS_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Subscribe to Firebase Auth session & handle any pending redirect result
  useEffect(() => {
    let mounted = true;

    completeGoogleRedirectSignIn().catch((err) => {
      if (mounted) {
        setAuthError(mapAuthError(err));
      }
    });

    const unsubscribe = subscribeToAuthSession((session) => {
      if (!mounted) return;

      if (session.status === 'authenticated' && session.partner) {
        setPartner(session.partner);
        setIsNewAccount(Boolean(session.isNewAccount));
        setAuthError('');
        setAuthStatus('authenticated');
      } else {
        setPartner(null);
        setOrders([]);
        setIsNewAccount(false);
        if (session.error) {
          setAuthError(session.error);
        }
        setAuthStatus('unauthenticated');
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Load partner's orders ONLY after authentication is verified
  useEffect(() => {
    let active = true;
    if (authStatus === 'authenticated' && partner?.uid) {
      setOrders(getAllOrdersForPartner(partner.uid));

      const doSync = () => {
        syncOrdersWithBackend(partner.uid).then((liveOrders) => {
          if (active && Array.isArray(liveOrders)) {
            setOrders(liveOrders);
          }
        });
      };

      doSync();
      // Poll every 10 seconds so new customer orders appear automatically
      const pollTimer = setInterval(doSync, 10000);

      return () => {
        active = false;
        clearInterval(pollTimer);
      };
    } else {
      setOrders([]);
    }
    return () => {
      active = false;
    };
  }, [authStatus, partner?.uid]);

  const toggleDutyStatus = useCallback(() => {
    setIsOnDuty((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DUTY_STATUS_KEY, String(next));
      } catch {
        // Ignore storage write failure in private browsing
      }
      if (partner?.uid) {
        syncDutyStatusWithBackend(partner.uid, next);
      }
      return next;
    });
  }, [partner?.uid]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError('');
    setAuthStatus('signing_in');

    try {
      const result = await signInWithGoogleService();
      if (result?.redirecting) {
        return { success: true, redirecting: true };
      }

      if (result?.partner) {
        // Set partner & authenticated cleanly (matches onAuthStateChanged without race/flicker)
        setPartner(result.partner);
        setIsNewAccount(Boolean(result.isNewAccount));
        setAuthStatus('authenticated');
        return { success: true, partner: result.partner, isNewAccount: result.isNewAccount };
      }

      setAuthStatus('unauthenticated');
      return { success: false };
    } catch (error) {
      const friendlyMessage = mapAuthError(error);
      setAuthError(friendlyMessage);
      setAuthStatus('unauthenticated');
      return { success: false, error: friendlyMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOutFromGoogle();
    } finally {
      setPartner(null);
      setOrders([]);
      setIsNewAccount(false);
      setAuthError('');
      setAuthStatus('unauthenticated');
      setIsSigningOut(false);
    }
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError('');
  }, []);

  const updateOrderStatus = useCallback(
    (orderId, nextStatus) => {
      if (authStatus !== 'authenticated' || !partner?.uid) return;
      const updated = updateOrderStatusInStore(partner.uid, orderId, nextStatus);
      setOrders(updated);
    },
    [authStatus, partner?.uid]
  );

  const reportIssue = useCallback(
    (orderId, reason, note) => {
      if (authStatus !== 'authenticated' || !partner?.uid) return;
      const updated = reportOrderIssueInStore(partner.uid, orderId, reason, note);
      setOrders(updated);
    },
    [authStatus, partner?.uid]
  );

  const resetDemoData = useCallback(() => {
    if (authStatus !== 'authenticated' || !partner?.uid) return;
    const reset = resetDemoOrders(partner.uid);
    setOrders(reset);
  }, [authStatus, partner?.uid]);

  const refreshOrders = useCallback(async () => {
    if (authStatus !== 'authenticated' || !partner?.uid) return [];
    const live = await syncOrdersWithBackend(partner.uid);
    if (Array.isArray(live)) {
      setOrders(live);
    }
    return live;
  }, [authStatus, partner?.uid]);

  // Active orders sorted by operational priority, then earliest assigned time
  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'delivered')
      .sort((a, b) => {
        const pA = ORDER_STATUS_CONFIG[a.status]?.priority ?? 9;
        const pB = ORDER_STATUS_CONFIG[b.status]?.priority ?? 9;
        if (pA !== pB) return pA - pB;
        return new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
      });
  }, [orders]);

  // Completed orders sorted newest first
  const completedOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'delivered')
      .sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime());
  }, [orders]);

  // Earnings summary
  const earningsSummary = useMemo(() => {
    const todayDeliveries = completedOrders.filter((o) => isToday(o.deliveredAt));
    const weekDeliveries = completedOrders.filter((o) => isThisWeek(o.deliveredAt));

    const sumPayout = (list) =>
      list.reduce((acc, o) => acc + (Number(o.payout) || DELIVERY_PAYOUT_PER_ORDER), 0);

    const baseHistoricalCount = partner?.totalDeliveries
      ? Math.max(0, partner.totalDeliveries - completedOrders.length)
      : 0;
    const totalCount = baseHistoricalCount + completedOrders.length;
    const totalEarnings =
      baseHistoricalCount * DELIVERY_PAYOUT_PER_ORDER + sumPayout(completedOrders);

    return {
      todayCount: todayDeliveries.length,
      todayEarnings: sumPayout(todayDeliveries),
      weekCount: weekDeliveries.length,
      weekEarnings: sumPayout(weekDeliveries),
      totalCount,
      totalEarnings,
      perOrderRate: DELIVERY_PAYOUT_PER_ORDER
    };
  }, [completedOrders, partner]);

  const value = {
    authStatus,
    isAuthenticated: authStatus === 'authenticated' && Boolean(partner),
    isCheckingAuth: authStatus === 'checking',
    isFirebaseConfigured,
    partner,
    authError,
    isNewAccount,
    isSigningOut,
    isOnDuty,
    orders,
    activeOrders,
    completedOrders,
    earningsSummary,
    toggleDutyStatus,
    signInWithGoogle,
    logout,
    clearAuthError,
    updateOrderStatus,
    reportIssue,
    resetDemoData,
    refreshOrders
  };

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) {
    throw new Error('useDelivery must be used inside a DeliveryProvider');
  }
  return ctx;
}
