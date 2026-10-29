import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useAccountGone } from '../hooks/useAccountGone.js';
import { getPartnerById, setPartnerOnline } from '../services/userService.js';
import { getOrders } from '../services/orderService.js';
import { t } from '../i18n/index.js';
import { ACTIVE_STATUSES } from '../utils/constants.js';
import { playBeep, vibrate } from '../utils/alerts.js';

const DeliveryContext = createContext(null);
const POLL_MS = 10000;

/**
 * Delivery partner data shared by every delivery page.
 * Provides:
 *  - partner, partnerLoading, partnerError, reloadPartner, setOnline(bool)
 *  - orders (all orders assigned to this partner, newest first), ordersLoading, ordersError, reloadOrders
 * Plays a beep + vibration when a NEW active order gets assigned.
 */
export function DeliveryProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const partnerId = user?.partnerId;

  const partnerState = useAsync(() => getPartnerById(partnerId), [partnerId]);
  const ordersState = useAsync(() => getOrders({ partnerId }), [partnerId]);
  const reloadOrders = ordersState.reload;
  const setPartnerData = partnerState.setData;
  useAccountGone(partnerState.error, partnerState.data);
  const known = useRef(null);

  useEffect(() => {
    const timer = setInterval(reloadOrders, POLL_MS);
    return () => clearInterval(timer);
  }, [reloadOrders]);

  // Alert when a new active order appears in the list.
  useEffect(() => {
    const orders = ordersState.data;
    if (!orders) return;
    const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (known.current === null) {
      known.current = new Set(active.map((o) => o.id));
      return;
    }
    const arrived = active.filter((o) => !known.current.has(o.id));
    if (!arrived.length) return;
    arrived.forEach((o) => known.current.add(o.id));
    playBeep();
    vibrate();
    showToast(t('delivery.home.newAssigned', { number: arrived[0].number }), { type: 'success', duration: 6000 });
  }, [ordersState.data, showToast]);

  const setOnline = useCallback(
    async (isOnline) => {
      const saved = await setPartnerOnline(partnerId, isOnline);
      setPartnerData(saved);
      return saved;
    },
    [partnerId, setPartnerData],
  );

  const value = useMemo(
    () => ({
      partner: partnerState.data,
      partnerLoading: partnerState.loading,
      partnerError: partnerState.error,
      reloadPartner: partnerState.reload,
      setOnline,
      orders: ordersState.data,
      ordersLoading: ordersState.loading,
      ordersError: ordersState.error,
      reloadOrders,
    }),
    [partnerState.data, partnerState.loading, partnerState.error, partnerState.reload, setOnline, ordersState.data, ordersState.loading, ordersState.error, reloadOrders],
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error('useDelivery must be used inside DeliveryProvider');
  return ctx;
}
