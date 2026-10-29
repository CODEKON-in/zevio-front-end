import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useAccountGone } from '../hooks/useAccountGone.js';
import { getShopById, saveShop } from '../services/shopService.js';
import { getOrders } from '../services/orderService.js';
import { t } from '../i18n/index.js';
import { ORDER_STATUS } from '../utils/constants.js';
import { playBeep, vibrate } from '../utils/alerts.js';

const ShopPanelContext = createContext(null);
const POLL_MS = 8000; // check for new orders every 8 seconds

/**
 * Shop owner data shared by every shop-panel page, so the new-order alert
 * works whichever page is open.
 * Provides:
 *  - shop, shopLoading, shopError, reloadShop, updateShop(patch)
 *  - orders (newest first), ordersLoading, ordersError, reloadOrders
 *  - freshIds: Set of PENDING order ids that arrived while the panel was open (highlighted)
 *  - markSeen(orderId)
 */
export function ShopPanelProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const shopId = user?.shopId;

  const shopState = useAsync(() => getShopById(shopId), [shopId]);
  const ordersState = useAsync(() => getOrders({ shopId }), [shopId]);
  const reloadOrders = ordersState.reload;
  const setShopData = shopState.setData;
  useAccountGone(shopState.error, shopState.data);

  const knownPlaced = useRef(null); // ids of PENDING orders already seen
  const [freshIds, setFreshIds] = useState(() => new Set());

  // Poll for new orders.
  useEffect(() => {
    const timer = setInterval(reloadOrders, POLL_MS);
    return () => clearInterval(timer);
  }, [reloadOrders]);

  // Detect PENDING orders we have not seen before → ring + vibrate + toast.
  useEffect(() => {
    const orders = ordersState.data;
    if (!orders) return;
    const placed = orders.filter((o) => o.status === ORDER_STATUS.PENDING);
    if (knownPlaced.current === null) {
      // First load: existing orders are not "new arrivals".
      knownPlaced.current = new Set(placed.map((o) => o.id));
      return;
    }
    const arrived = placed.filter((o) => !knownPlaced.current.has(o.id));
    if (!arrived.length) return;
    arrived.forEach((o) => knownPlaced.current.add(o.id));
    setFreshIds((prev) => new Set([...prev, ...arrived.map((o) => o.id)]));
    playBeep();
    vibrate();
    const first = arrived[0];
    showToast(t('shopPanel.dashboard.newOrderToast', { number: first.number, name: first.customerName }), { type: 'success', duration: 6000 });
  }, [ordersState.data, showToast]);

  const markSeen = useCallback((id) => {
    setFreshIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateShop = useCallback(
    async (patch) => {
      const saved = await saveShop({ id: shopId, ...patch });
      setShopData(saved);
      return saved;
    },
    [shopId, setShopData],
  );

  const value = useMemo(
    () => ({
      shop: shopState.data,
      shopLoading: shopState.loading,
      shopError: shopState.error,
      reloadShop: shopState.reload,
      updateShop,
      orders: ordersState.data,
      ordersLoading: ordersState.loading,
      ordersError: ordersState.error,
      reloadOrders,
      freshIds,
      markSeen,
    }),
    [shopState.data, shopState.loading, shopState.error, shopState.reload, updateShop, ordersState.data, ordersState.loading, ordersState.error, reloadOrders, freshIds, markSeen],
  );

  return <ShopPanelContext.Provider value={value}>{children}</ShopPanelContext.Provider>;
}

export function useShopPanel() {
  const ctx = useContext(ShopPanelContext);
  if (!ctx) throw new Error('useShopPanel must be used inside ShopPanelProvider');
  return ctx;
}
