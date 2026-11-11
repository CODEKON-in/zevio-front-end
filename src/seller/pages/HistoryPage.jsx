import React, { useState, useEffect, useMemo } from 'react';
import { useSellerAuth } from '../context/SellerAuthContext';
import { subscribeToShopOrders } from '../services/orders';
import OrderCard from '../components/orders/OrderCard';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import OrderSkeleton from '../components/orders/OrderSkeleton';

/*
 * Order history — every order this shop has ever taken.
 *
 * The Orders tab is for the next few minutes: what to cook, what to hand over.
 * This one is for looking back — what went out yesterday, what a customer
 * ordered last week, how much a day came to. So it is read-only: orders still
 * in progress appear here too, but they are managed on the Orders tab.
 */

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7days', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'live', label: 'In progress' },
];

/** Orders carry a Firestore timestamp, an ISO string or nothing at all. */
function orderMillis(order) {
  const t = order?.createdAt;
  if (t?.toMillis) return t.toMillis();
  if (t?.seconds) return t.seconds * 1000;
  if (t) {
    const ms = new Date(t).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** The earliest moment a period includes, or null for "all time". */
function periodStart(period) {
  const now = new Date();
  const today = startOfDay(now);
  if (period === 'today') return today;
  if (period === 'yesterday') return today - 86400000;
  if (period === '7days') return today - 6 * 86400000;
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return null;
}

/** Yesterday is only yesterday — not "yesterday and everything before it". */
function inPeriod(ms, period) {
  const from = periodStart(period);
  if (from === null) return true;
  if (ms < from) return false;
  if (period === 'yesterday') return ms < startOfDay(new Date());
  return true;
}

/** "Today", "Yesterday", or "Sat, 8 Nov 2026". */
function dayLabel(ms) {
  const today = startOfDay(new Date());
  const day = startOfDay(new Date(ms));
  if (day === today) return 'Today';
  if (day === today - 86400000) return 'Yesterday';
  return new Date(ms).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

const orderTotal = (o) => Number(o.totalAmount || o.total || o.subtotal || 0) || 0;

export default function HistoryPage() {
  const { user } = useSellerAuth();
  const shopId = user?.shopId;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('today');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!shopId) return undefined;
    setLoading(true);
    setError(null);
    const unsub = subscribeToShopOrders(shopId, ({ orders: fresh, loading: l, error: err }) => {
      setLoading(l);
      if (err) {
        setError(err);
        return;
      }
      setOrders(fresh);
    });
    return () => unsub && unsub();
  }, [shopId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (!inPeriod(orderMillis(o), period)) return false;

      const s = o.normalizedStatus;
      if (status === 'live' && (s === 'completed' || s === 'rejected')) return false;
      if (status !== 'all' && status !== 'live' && s !== status) return false;

      if (!q) return true;
      const haystack = [
        o.customerName,
        o.customer?.name,
        o.orderNumber,
        o.id,
        o.deliveryArea,
        ...(Array.isArray(o.items) ? o.items.map((i) => i.name || i.productName) : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, period, status, search]);

  /* What the shop actually earned: rejected orders brought in nothing. */
  const earned = filtered
    .filter((o) => o.normalizedStatus !== 'rejected')
    .reduce((sum, o) => sum + orderTotal(o), 0);

  /* One block per day, newest first — the list is already sorted that way. */
  const days = useMemo(() => {
    const groups = [];
    let current = null;
    for (const order of filtered) {
      const key = startOfDay(new Date(orderMillis(order)));
      if (!current || current.key !== key) {
        current = { key, label: dayLabel(orderMillis(order)), orders: [], total: 0 };
        groups.push(current);
      }
      current.orders.push(order);
      if (order.normalizedStatus !== 'rejected') current.total += orderTotal(order);
    }
    return groups;
  }, [filtered]);

  const chipStyle = (isActive) => ({
    minHeight: '42px',
    padding: '0 14px',
    borderRadius: 'var(--radius-pill)',
    fontFamily: 'var(--font-display)',
    fontSize: '13.5px',
    fontWeight: isActive ? 800 : 600,
    color: isActive ? 'var(--mango-text)' : 'var(--ink-600)',
    backgroundColor: isActive ? 'var(--mango-500)' : 'var(--cream-card)',
    border: `1.5px solid ${isActive ? 'var(--mango-600)' : 'var(--line)'}`,
    boxShadow: isActive ? 'var(--shadow-mango)' : 'var(--shadow-xs)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    transition: 'all var(--transition-fast)',
  });

  return (
    <div className="page-container">
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>Order history</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--ink-600)' }}>
          Every order this shop has taken
        </p>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <input
          type="search"
          placeholder="Search by customer, order #, area or dish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            minHeight: 'var(--touch-target-min)',
            padding: '0 16px',
            backgroundColor: 'var(--cream-card)',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--ink-900)',
            fontSize: '14px',
            boxShadow: 'var(--shadow-xs)',
          }}
        />
      </div>

      <div className="chip-scroller-wrap">
        <div className="chip-scroller" style={{ marginBottom: '10px' }} role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              className={period === p.id ? 'mango-surface' : undefined}
              onClick={() => setPeriod(p.id)}
              style={chipStyle(period === p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chip-scroller-wrap">
        <div className="chip-scroller" style={{ marginBottom: '16px' }} role="tablist" aria-label="Status">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={status === s.id}
              className={status === s.id ? 'mango-surface' : undefined}
              onClick={() => setStatus(s.id)}
              style={chipStyle(status === s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* What the filters above add up to. */}
      {!loading && !error && (
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-600)' }}>
            {filtered.length} {filtered.length === 1 ? 'order' : 'orders'}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap' }}>
            ₹{earned.toFixed(0)}
          </span>
        </div>
      )}

      {loading ? (
        <OrderSkeleton count={4} />
      ) : error ? (
        <div className="error-state">
          <p>
            <strong>Failed to load history:</strong> {error}
          </p>
        </div>
      ) : days.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <h3 className="empty-state-title">Nothing here yet</h3>
          <p className="empty-state-desc">
            {search
              ? `No orders match "${search}".`
              : 'No orders in this period. Try a longer one, like All time.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {days.map((day) => (
            <section key={day.key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: '10px',
                }}
              >
                <h2 style={{ fontSize: '15px' }}>{day.label}</h2>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-600)', whiteSpace: 'nowrap' }}>
                  {day.orders.length} · ₹{day.total.toFixed(0)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {day.orders.map((order) => (
                  <OrderCard key={order.id} order={order} onViewDetails={setSelectedOrder} readOnly />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <OrderDetailModal
        isOpen={Boolean(selectedOrder)}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        readOnly
      />
    </div>
  );
}
