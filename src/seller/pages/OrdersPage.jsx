import React, { useState, useEffect, useRef } from 'react';
import { useSellerAuth } from '../context/SellerAuthContext';
import {
  subscribeToShopOrders,
  acceptOrder,
  rejectOrder,
  markOrderReady,
} from '../services/orders';
import { playOrderAlertSound } from '../utils/audioAlert';
import OrderCard from '../components/orders/OrderCard';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import RejectModal from '../components/orders/RejectModal';
import OrderSkeleton from '../components/orders/OrderSkeleton';

const ORDER_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
];

export default function OrdersPage() {
  const { user } = useSellerAuth();
  const shopId = user?.shopId;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderToReject, setOrderToReject] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Audio alert & new order tracking
  const previousOrdersRef = useRef([]);
  const isFirstLoadRef = useRef(true);
  const [newlyArrivedIds, setNewlyArrivedIds] = useState(new Set());

  const loadOrders = () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);

    const unsub = subscribeToShopOrders(shopId, ({ orders: freshOrders, loading: l, error: err }) => {
      setLoading(l);
      if (err) {
        setError(err);
        return;
      }

      if (!isFirstLoadRef.current && freshOrders.length > 0) {
        const prevIds = new Set(previousOrdersRef.current.map((o) => o.id));
        const newOrders = freshOrders.filter(
          (o) => !prevIds.has(o.id) && o.normalizedStatus === 'new'
        );
        if (newOrders.length > 0) {
          playOrderAlertSound();
          setNewlyArrivedIds(new Set(newOrders.map((o) => o.id)));
        }
      }

      isFirstLoadRef.current = false;
      previousOrdersRef.current = freshOrders;
      setOrders(freshOrders);
    });

    return unsub;
  };

  useEffect(() => {
    const unsub = loadOrders();
    return () => {
      if (unsub) unsub();
    };
  }, [shopId]);

  // Actions
  const handleAcceptOrder = async (orderId) => {
    try {
      setIsActionLoading(true);
      await acceptOrder(orderId);
      setNewlyArrivedIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, normalizedStatus: 'preparing' } : null));
      }
    } catch (err) {
      alert(`Accept failed: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenReject = (order) => {
    setOrderToReject(order);
  };

  const handleConfirmReject = async (orderId, reason) => {
    try {
      setIsActionLoading(true);
      await rejectOrder(orderId, reason);
      setOrderToReject(null);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err) {
      alert(`Reject failed: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkReady = async (orderId) => {
    try {
      setIsActionLoading(true);
      await markOrderReady(orderId);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, normalizedStatus: 'ready' } : null));
      }
    } catch (err) {
      alert(`Mark ready failed: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter & Search
  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === 'all' || order.normalizedStatus === activeTab;
    if (!matchesTab) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const customer = (order.customerName || order.customer?.name || '').toLowerCase();
    const id = order.id.toLowerCase();
    const area = (order.deliveryArea || '').toLowerCase();
    return customer.includes(q) || id.includes(q) || area.includes(q);
  });

  return (
    <div className="page-container">
      {/* Title & sound indicator */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>Live Orders</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-600)' }}>
            New orders arrive here with a chime
          </p>
        </div>

        {/* Test alert chime button */}
        <button
          type="button"
          onClick={() => playOrderAlertSound()}
          className="btn-icon"
          style={{ width: '44px', height: '44px', minWidth: '44px', flexShrink: 0 }}
          title="Play the new-order chime"
          aria-label="Play the new-order chime"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '14px' }}>
        <input
          type="search"
          placeholder="Search by customer name, order # or area..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Status Filter Tabs */}
      <div className="chip-scroller-wrap">
        <div className="chip-scroller"
          style={{ marginBottom: '18px' }}
          >
          {ORDER_FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tab.id === 'all'
              ? orders.length
              : orders.filter((o) => o.normalizedStatus === tab.id).length;

            return (
              <button
                key={tab.id}
                type="button"
                className={isActive ? 'mango-surface' : undefined}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  minHeight: '42px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--font-heading)',
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
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: isActive ? 'rgba(58, 42, 8, 0.15)' : 'var(--mango-100)',
                    color: 'var(--mango-text)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

        {/* Orders List */}
        <div>
          {loading ? (
            <OrderSkeleton count={4} />
          ) : error ? (
            <div className="error-state">
              <p><strong>Failed to load orders:</strong> {error}</p>
              <button type="button" onClick={loadOrders} className="btn-secondary">
                ↻ Retry Connection
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                </svg>
              </div>
              <h3 className="empty-state-title">No orders found</h3>
              <p className="empty-state-desc">
                {searchQuery
                  ? `No results match "${searchQuery}". Clear your search query to see all orders.`
                  : `There are currently no orders in the "${activeTab}" filter.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNewlyArrived={newlyArrivedIds.has(order.id)}
                  onViewDetails={setSelectedOrder}
                  onAccept={handleAcceptOrder}
                  onOpenReject={handleOpenReject}
                  onMarkReady={handleMarkReady}
                  isActionLoading={isActionLoading}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        <OrderDetailModal
          isOpen={Boolean(selectedOrder)}
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAccept={handleAcceptOrder}
          onOpenReject={handleOpenReject}
          onMarkReady={handleMarkReady}
          isActionLoading={isActionLoading}
        />

        <RejectModal
          isOpen={Boolean(orderToReject)}
          order={orderToReject}
          onConfirm={handleConfirmReject}
          onCancel={() => setOrderToReject(null)}
          isSubmitting={isActionLoading}
        />
      
      </div>
  );
}
