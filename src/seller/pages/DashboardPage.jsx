import React, { useState, useEffect, useRef } from 'react';
import { useSellerAuth } from '../context/SellerAuthContext';
import {
  subscribeToShopOrders,
  acceptOrder,
  rejectOrder,
  markOrderReady,
  calculateTodayMetrics,
} from '../services/orders';
import { subscribeToShop, updateShopStatus } from '../services/shops';
import { playOrderAlertSound } from '../utils/audioAlert';
import OrderCard from '../components/orders/OrderCard';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import RejectModal from '../components/orders/RejectModal';
import OrderSkeleton from '../components/orders/OrderSkeleton';

const TABS = [
  { id: 'new', label: 'New' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
];

export default function DashboardPage() {
  const { user, seller } = useSellerAuth();
  const shopId = user?.shopId;

  // Shop Open/Closed state
  const [shopData, setShopData] = useState(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [isTogglingShop, setIsTogglingShop] = useState(false);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [activeTab, setActiveTab] = useState('new');

  // Modals & action states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderToReject, setOrderToReject] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Track previous orders to detect newly arrived orders and trigger sound
  const previousOrdersRef = useRef([]);
  const isFirstLoadRef = useRef(true);
  const [newlyArrivedIds, setNewlyArrivedIds] = useState(new Set());

  // 1. Subscribe to Shop Doc (Open/Closed status)
  useEffect(() => {
    if (!shopId) return;
    const unsubShop = subscribeToShop(shopId, ({ shop, loading }) => {
      setShopData(shop);
      setShopLoading(loading);
    });
    return () => unsubShop();
  }, [shopId]);

  // 2. Subscribe to Orders strictly scoped to this shopId
  const loadOrders = () => {
    if (!shopId) return;
    setOrdersLoading(true);
    setOrdersError(null);

    const unsubOrders = subscribeToShopOrders(shopId, ({ orders: freshOrders, loading, error }) => {
      setOrdersLoading(loading);
      if (error) {
        setOrdersError(error);
        return;
      }

      // Check for incoming 'new' orders to play sound and highlight
      if (!isFirstLoadRef.current && freshOrders.length > 0) {
        const prevIds = new Set(previousOrdersRef.current.map((o) => o.id));
        const brandNewOrders = freshOrders.filter(
          (o) => !prevIds.has(o.id) && o.normalizedStatus === 'new'
        );

        if (brandNewOrders.length > 0) {
          playOrderAlertSound();
          const newIds = new Set(brandNewOrders.map((o) => o.id));
          setNewlyArrivedIds(newIds);
          // Switch to 'new' tab so the shop owner sees it immediately
          setActiveTab('new');
        }
      }

      isFirstLoadRef.current = false;
      previousOrdersRef.current = freshOrders;
      setOrders(freshOrders);
    });

    return unsubOrders;
  };

  useEffect(() => {
    const unsub = loadOrders();
    return () => {
      if (unsub) unsub();
    };
  }, [shopId]);

  // Toggle Shop Open/Closed
  const handleToggleShop = async () => {
    if (!shopId || isTogglingShop) return;
    const currentStatus = shopData?.isOpen ?? true;
    try {
      setIsTogglingShop(true);
      await updateShopStatus(shopId, !currentStatus);
    } catch (err) {
      alert(`Could not update shop status: ${err.message}`);
    } finally {
      setIsTogglingShop(false);
    }
  };

  // Order Actions
  const handleAcceptOrder = async (orderId) => {
    try {
      setIsActionLoading(true);
      await acceptOrder(orderId);
      // Remove from new highlight if present
      setNewlyArrivedIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, normalizedStatus: 'preparing' } : null));
      }
    } catch (err) {
      alert(`Failed to accept order: ${err.message}`);
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
      alert(`Failed to reject order: ${err.message}`);
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
      alert(`Failed to mark ready: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Metrics calculation
  const { todayCount, todaySales } = calculateTodayMetrics(orders);
  const isOpen = shopData?.isOpen ?? true;
  const shopName = shopData?.name || seller?.shopName || 'My Store';

  // Filter orders by active tab
  const filteredOrders = orders.filter((o) => o.normalizedStatus === activeTab);

  // Tab count lookup
  const countByStatus = {
    new: orders.filter((o) => o.normalizedStatus === 'new').length,
    preparing: orders.filter((o) => o.normalizedStatus === 'preparing').length,
    ready: orders.filter((o) => o.normalizedStatus === 'ready').length,
    completed: orders.filter((o) => o.normalizedStatus === 'completed').length,
  };

  return (
    <div className="page-container">
      {/* Top Header: Shop Name & Big Open/Closed Toggle */}
      <div
        className="dashboard-header-row"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>{shopName}</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-600)' }}>
            Today's orders and takings, live
          </p>
        </div>

        {/* Big Open/Closed Toggle button */}
        <button
          type="button"
          onClick={handleToggleShop}
          disabled={shopLoading || isTogglingShop}
          className="shop-toggle-btn"
          style={{
            minHeight: '48px',
            padding: '0 22px',
            borderRadius: 'var(--radius-pill)',
            border: `2px solid ${isOpen ? 'var(--success)' : 'var(--error)'}`,
            background: isOpen ? 'var(--success-bg)' : 'var(--error-bg)',
            color: isOpen ? 'var(--success)' : 'var(--error)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: '15px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: 'var(--shadow-sm)',
            cursor: shopLoading || isTogglingShop ? 'wait' : 'pointer',
            transition: 'all var(--transition-fast)',
            opacity: isTogglingShop ? 0.7 : 1,
          }}
          aria-label={`Shop is currently ${isOpen ? 'Open' : 'Closed'}. Tap to toggle.`}
        >
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isOpen ? 'var(--success)' : 'var(--error)',
              boxShadow: `0 0 0 3px ${
                isOpen ? 'rgba(47,125,74,0.25)' : 'rgba(200,69,59,0.25)'
              }`,
            }}
          />
          {isTogglingShop ? 'UPDATING...' : isOpen ? 'SHOP IS OPEN' : 'SHOP IS CLOSED'}
        </button>
      </div>

      {/* Metrics Row: Today's Orders & Today's Sales */}
      <div
        style={{
          display: 'grid',
          /* Two up on a phone, and capped so two numbers don't stretch half a
             laptop screen each. (A fixed max in minmax() would have dropped
             the phone to one column, because auto-fit counts by that max.) */
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          maxWidth: '560px',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-600)' }}>
            Today's Orders
          </span>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--ink-900)',
            }}
          >
            {todayCount}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--ink-600)' }}>
            {countByStatus.new} new pending
          </span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-600)' }}>
            Today's Sales
          </span>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--ink-900)',
            }}
          >
            ₹{todaySales.toFixed(0)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>
            {countByStatus.completed} completed
          </span>
        </div>
      </div>

      {/* Order Status Tabs */}
      <div className="chip-scroller-wrap">
        <div className="chip-scroller" style={{ marginBottom: '16px' }} role="tablist">
          {TABS.map((tab) => {
            const count = countByStatus[tab.id] || 0;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                className={isActive ? 'mango-surface' : undefined}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
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
                    padding: '2px 7px',
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

        {/* Orders List Area */}
        <div>
          {ordersLoading ? (
            <OrderSkeleton count={3} />
          ) : ordersError ? (
            <div className="error-state">
              <p><strong>Failed to load orders:</strong> {ordersError}</p>
              <button type="button" onClick={loadOrders} className="btn-secondary">
                ↻ Try Again
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
              <h3 className="empty-state-title">
                No {activeTab} orders
              </h3>
              <p className="empty-state-desc">
                {activeTab === 'new'
                  ? 'Incoming orders will appear here in real time with an audio alert.'
                  : `No orders are currently in "${activeTab}" status.`}
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

        {/* Order Detail Modal */}
        <OrderDetailModal
          isOpen={Boolean(selectedOrder)}
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAccept={handleAcceptOrder}
          onOpenReject={handleOpenReject}
          onMarkReady={handleMarkReady}
          isActionLoading={isActionLoading}
        />

        {/* Rejection Reason Modal */}
        <RejectModal
          isOpen={Boolean(orderToReject)}
          order={orderToReject}
          onConfirm={handleConfirmReject}
          onCancel={() => setOrderToReject(null)}
          isSubmitting={isActionLoading}
        />

        <style>{`
          @media (max-width: 480px) {
            .shop-toggle-btn {
              width: 100% !important;
            }
          }
        `}</style>
      
      </div>
  );
}
