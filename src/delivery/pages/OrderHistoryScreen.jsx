import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { useDelivery } from '../context/DeliveryContext';
import {
  formatDateShort,
  formatTimeShort,
  isToday,
  isThisWeek,
  getTotalItemUnits
} from '../utils/dateUtils';

export default function OrderHistoryScreen() {
  const { completedOrders } = useDelivery();
  const [rangeFilter, setRangeFilter] = useState('all'); // 'today' | 'week' | 'all'

  const filteredHistory = useMemo(() => {
    if (rangeFilter === 'today') {
      return completedOrders.filter((o) => isToday(o.deliveredAt));
    }
    if (rangeFilter === 'week') {
      return completedOrders.filter((o) => isThisWeek(o.deliveredAt));
    }
    return completedOrders;
  }, [completedOrders, rangeFilter]);

  const todayCount = completedOrders.filter((o) => isToday(o.deliveredAt)).length;
  const weekCount = completedOrders.filter((o) => isThisWeek(o.deliveredAt)).length;

  return (
    <div className="screen-container">
      <header className="page-header">
        <h1 className="page-header__title">Order History</h1>
        <p className="page-header__subtitle">Completed deliveries in Papanasam – Ayyampettai</p>
      </header>

      {/* Filter Tabs: Today / This Week / All */}
      <div className="filter-tabs" role="tablist" aria-label="Filter order history by period">
        <button
          type="button"
          role="tab"
          aria-selected={rangeFilter === 'today'}
          className={`filter-tab ${rangeFilter === 'today' ? 'filter-tab--active' : ''}`}
          onClick={() => setRangeFilter('today')}
        >
          Today ({todayCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={rangeFilter === 'week'}
          className={`filter-tab ${rangeFilter === 'week' ? 'filter-tab--active' : ''}`}
          onClick={() => setRangeFilter('week')}
        >
          This Week ({weekCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={rangeFilter === 'all'}
          className={`filter-tab ${rangeFilter === 'all' ? 'filter-tab--active' : ''}`}
          onClick={() => setRangeFilter('all')}
        >
          All ({completedOrders.length})
        </button>
      </div>

      {filteredHistory.length > 0 ? (
        <div className="history-list">
          {filteredHistory.map((order) => (
            <Link
              to={`/delivery/orders/${order.orderId}`}
              key={order.orderId}
              className="history-card"
            >
              <div className="history-card__top">
                <span className="history-card__id">#{order.orderId}</span>
                <StatusBadge status={order.status} />
              </div>

              <div className="history-card__mid">
                <div className="history-card__names">
                  <strong>{order.customerName}</strong>
                  <span className="history-card__shop">from {order.shopName}</span>
                </div>
                <span className="history-card__payout">+₹{order.payout || 35}</span>
              </div>

              <div className="history-card__bottom">
                <span className="history-card__datetime">
                  {formatDateShort(order.deliveredAt)} • {formatTimeShort(order.deliveredAt)}
                </span>
                <span className="history-card__items">
                  {getTotalItemUnits(order.items)} units
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2 className="empty-state__title">No completed deliveries found</h2>
          <p className="empty-state__desc">
            Try switching the filter to "This Week" or "All" to view earlier deliveries.
          </p>
        </div>
      )}
    </div>
  );
}
