import React, { useState } from 'react';
import OrderCard from '../components/OrderCard';
import { useDelivery } from '../context/DeliveryContext';

export default function ActiveOrdersScreen() {
  const { partner, activeOrders, earningsSummary, isOnDuty, toggleDutyStatus, resetDemoData, refreshOrders } =
    useDelivery();
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrders();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredOrders =
    statusFilter === 'all'
      ? activeOrders
      : activeOrders.filter((o) => o.status === statusFilter);

  const countByStatus = (st) => activeOrders.filter((o) => o.status === st).length;

  return (
    <div className="screen-container">
      {/* Off-Duty Notice Banner */}
      {!isOnDuty && (
        <div className="duty-banner" role="status">
          <span>You are currently <strong>Off Duty</strong>. Go On Duty to receive new orders.</span>
          <button type="button" className="duty-banner__btn" onClick={toggleDutyStatus}>
            Go On Duty
          </button>
        </div>
      )}

      {/* Greeting & Quick Summary Banner */}
      <section className="hero-banner">
        <div className="hero-banner__left">
          <p className="hero-banner__greeting">
            Vanakkam, {partner?.name?.split(' ')[0] || 'Partner'}
          </p>
          <h1 className="hero-banner__title">
            {activeOrders.length === 0
              ? 'All Assigned Orders Completed!'
              : `${activeOrders.length} Active ${activeOrders.length === 1 ? 'Order' : 'Orders'}`}
          </h1>
        </div>
        <div className="hero-banner__stat">
          <span className="hero-banner__stat-num">{earningsSummary.todayCount}</span>
          <span className="hero-banner__stat-label">Done Today</span>
        </div>
      </section>

      {/* Quick Filter Pills */}
      <div className="filter-tabs" role="tablist" aria-label="Filter active orders by status">
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'all'}
          className={`filter-tab ${statusFilter === 'all' ? 'filter-tab--active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({activeOrders.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'out_for_delivery'}
          className={`filter-tab ${statusFilter === 'out_for_delivery' ? 'filter-tab--active' : ''}`}
          onClick={() => setStatusFilter('out_for_delivery')}
        >
          Out ({countByStatus('out_for_delivery')})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'picked_up'}
          className={`filter-tab ${statusFilter === 'picked_up' ? 'filter-tab--active' : ''}`}
          onClick={() => setStatusFilter('picked_up')}
        >
          Picked Up ({countByStatus('picked_up')})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'assigned'}
          className={`filter-tab ${statusFilter === 'assigned' ? 'filter-tab--active' : ''}`}
          onClick={() => setStatusFilter('assigned')}
        >
          Assigned ({countByStatus('assigned')})
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="order-list">
          {filteredOrders.map((order) => (
            <OrderCard key={order.orderId} order={order} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">✓</div>
          <h2 className="empty-state__title">No orders in this view</h2>
          <p className="empty-state__desc">
            {activeOrders.length === 0
              ? 'You have completed all assigned deliveries for now. New orders from Papanasam & Ayyampettai shops will appear here.'
              : 'No orders match the selected status filter.'}
          </p>
          {activeOrders.length === 0 && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Checking...' : 'Check for Orders'}
              </button>
              <button type="button" className="btn btn--outline" onClick={resetDemoData}>
                Load Demo Sample Orders
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
