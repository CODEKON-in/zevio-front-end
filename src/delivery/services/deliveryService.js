// Orders Data Service for MYNT Delivery Partner App
// Connects to Zevio / MYNT Delivery Partner API via the local/Vercel proxy (/api/partner/*).
// Supports instant local storage rendering with seamless live API sync & offline resilience.

import { INITIAL_ORDERS, DELIVERY_PAYOUT_PER_ORDER } from '../data/mockData';
import { getAuthToken } from './authService';

const ORDERS_STORAGE_PREFIX = 'mynt_dp_orders_v2_';
const MOCK_ORDER_IDS = new Set(['MYNT-2048', 'MYNT-2051', 'MYNT-2039', 'MYNT-1998']);

function getOrdersStorageKey(partnerUid) {
  return `${ORDERS_STORAGE_PREFIX}${partnerUid || 'demo'}`;
}

export function seedOrdersForPartner(partnerUid) {
  const seeded = INITIAL_ORDERS.map((order) => ({
    ...order,
    assignedTo: partnerUid
  }));
  try {
    localStorage.setItem(getOrdersStorageKey(partnerUid), JSON.stringify(seeded));
  } catch {
    // Ignore in restricted browsing contexts
  }
  return seeded;
}

/**
 * Returns cached orders immediately from local storage for instant render.
 * Purges legacy mock orders so only real API orders are retained.
 */
export function getAllOrdersForPartner(partnerUid) {
  if (!partnerUid) return [];
  const key = getOrdersStorageKey(partnerUid);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // If storage contains only the initial demo sample orders, purge them
    const isMockOnly = parsed.length > 0 && parsed.every((o) => MOCK_ORDER_IDS.has(o.orderId));
    if (isMockOnly) {
      localStorage.removeItem(key);
      return [];
    }
    return parsed.filter((o) => !MOCK_ORDER_IDS.has(o.orderId));
  } catch {
    return [];
  }
}

/**
 * Helper to build authenticated API request headers.
 */
function buildHeaders(partnerUid) {
  const headers = {};
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (partnerUid) {
    headers['X-Partner-Id'] = partnerUid;
  }
  return headers;
}

/**
 * Syncs orders with the live backend API (/api/partner/orders).
 */
export async function syncOrdersWithBackend(partnerUid) {
  if (!partnerUid) return [];

  try {
    const headers = buildHeaders(partnerUid);
    const res = await fetch('/api/partner/orders?scope=all', {
      method: 'GET',
      headers
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        // Filter out legacy sample mock orders from being stored
        const liveOrders = data.data
          .filter((o) => !MOCK_ORDER_IDS.has(o.orderId) && !MOCK_ORDER_IDS.has(o.order_number))
          .map((o) => ({
            ...o,
            assignedTo: o.delivery_partner_id || partnerUid
          }));

        try {
          localStorage.setItem(getOrdersStorageKey(partnerUid), JSON.stringify(liveOrders));
        } catch {
          // Ignore quota error
        }
        return liveOrders;
      }
    }
  } catch {
    // Offline or network error: retain local storage data
  }

  return getAllOrdersForPartner(partnerUid);
}

/**
 * Fetches single order details from the backend.
 */
export async function fetchOrderDetailsFromBackend(orderId, partnerUid) {
  if (!orderId) return null;
  try {
    const headers = buildHeaders(partnerUid);
    const res = await fetch(`/api/partner/order/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers
    });
    if (res.ok) {
      const json = await res.json();
      return json?.data || null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Updates order status in local store immediately and syncs with backend.
 */
export function updateOrderStatusInStore(partnerUid, orderId, nextStatus) {
  if (!partnerUid) return [];
  const currentOrders = getAllOrdersForPartner(partnerUid);
  const updatedOrders = currentOrders.map((order) => {
    if (order.orderId !== orderId && order.id !== orderId) return order;
    return {
      ...order,
      status: nextStatus,
      deliveredAt: nextStatus === 'delivered' ? new Date().toISOString() : order.deliveredAt,
      payout: order.payout || DELIVERY_PAYOUT_PER_ORDER
    };
  });

  try {
    localStorage.setItem(getOrdersStorageKey(partnerUid), JSON.stringify(updatedOrders));
  } catch {
    // Ignore storage write failure
  }

  // Asynchronously notify backend API
  (async () => {
    try {
      const headers = buildHeaders(partnerUid);
      const params = new URLSearchParams();
      params.append('order_id', orderId);
      params.append('next_status', nextStatus);

      await fetch('/api/partner/order/update-status/', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
    } catch {
      // Local optimistic update remains intact
    }
  })();

  return updatedOrders;
}

/**
 * Records issue report in local store and syncs with backend.
 */
export function reportOrderIssueInStore(partnerUid, orderId, reason, note = '') {
  if (!partnerUid) return [];
  const currentOrders = getAllOrdersForPartner(partnerUid);
  const updatedOrders = currentOrders.map((order) => {
    if (order.orderId !== orderId && order.id !== orderId) return order;
    return {
      ...order,
      issueReported: {
        reason,
        note: note.trim(),
        reportedAt: new Date().toISOString()
      }
    };
  });

  try {
    localStorage.setItem(getOrdersStorageKey(partnerUid), JSON.stringify(updatedOrders));
  } catch {
    // Ignore storage write failure
  }

  // Asynchronously notify backend API
  (async () => {
    try {
      const headers = buildHeaders(partnerUid);
      const params = new URLSearchParams();
      params.append('order_id', orderId);
      params.append('reason', reason);
      if (note) params.append('note', note.trim());

      await fetch('/api/partner/order/report-issue/', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
    } catch {
      // Local optimistic update remains intact
    }
  })();

  return updatedOrders;
}

/**
 * Syncs duty toggle with the backend API.
 */
export async function syncDutyStatusWithBackend(partnerUid, isOnline) {
  if (!partnerUid) return;
  try {
    const headers = buildHeaders(partnerUid);
    const params = new URLSearchParams();
    params.append('status', String(isOnline));

    await fetch('/api/partner/duty/toggle/', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
  } catch {
    // Best-effort sync
  }
}

/**
 * Fetches earnings summary from backend API if available.
 */
export async function fetchEarningsFromBackend(partnerUid) {
  if (!partnerUid) return null;
  try {
    const headers = buildHeaders(partnerUid);
    const res = await fetch('/api/partner/earnings', {
      method: 'GET',
      headers
    });
    if (res.ok) {
      const json = await res.json();
      return json?.data || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function resetDemoOrders(partnerUid) {
  if (!partnerUid) return [];
  return seedOrdersForPartner(partnerUid);
}
