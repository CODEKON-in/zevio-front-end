import React from 'react';
import { useDelivery } from '../context/DeliveryContext';
import { formatDateShort, formatTimeShort } from '../utils/dateUtils';

export default function EarningsScreen() {
  const { earningsSummary, completedOrders } = useDelivery();

  return (
    <div className="screen-container">
      <header className="page-header">
        <h1 className="page-header__title">Earnings Summary</h1>
        <p className="page-header__subtitle">
          Fixed payout structure • Base ₹{earningsSummary.perOrderRate}/delivery
        </p>
      </header>

      {/* Primary Today Earnings Highlight Card */}
      <section className="earnings-hero-card">
        <div className="earnings-hero-card__main">
          <span className="earnings-hero-card__label">TODAY'S EARNINGS</span>
          <h2 className="earnings-hero-card__amount">₹{earningsSummary.todayEarnings}</h2>
          <span className="earnings-hero-card__sub">
            {earningsSummary.todayCount}{' '}
            {earningsSummary.todayCount === 1 ? 'delivery' : 'deliveries'} completed today
          </span>
        </div>
      </section>

      {/* 3-Box Summary Grid (Today / This Week / Total) */}
      <section className="earnings-grid" aria-label="Deliveries and payout breakdown">
        <div className="stat-card">
          <span className="stat-card__period">TODAY</span>
          <strong className="stat-card__count">{earningsSummary.todayCount}</strong>
          <span className="stat-card__unit">Deliveries</span>
          <span className="stat-card__money">₹{earningsSummary.todayEarnings}</span>
        </div>

        <div className="stat-card">
          <span className="stat-card__period">THIS WEEK</span>
          <strong className="stat-card__count">{earningsSummary.weekCount}</strong>
          <span className="stat-card__unit">Deliveries</span>
          <span className="stat-card__money">₹{earningsSummary.weekEarnings}</span>
        </div>

        <div className="stat-card stat-card--highlight">
          <span className="stat-card__period">ALL-TIME</span>
          <strong className="stat-card__count">{earningsSummary.totalCount}</strong>
          <span className="stat-card__unit">Deliveries</span>
          <span className="stat-card__money">
            ₹{earningsSummary.totalEarnings.toLocaleString('en-IN')}
          </span>
        </div>
      </section>

      {/* Recent Payout Ledger */}
      <section className="detail-card">
        <div className="card-section-header">
          <h2 className="card-section-title">Recent Delivery Payouts</h2>
          <span className="card-section-subtitle">Settled weekly</span>
        </div>

        {completedOrders.length > 0 ? (
          <div className="payout-list">
            {completedOrders.slice(0, 6).map((order) => (
              <div key={order.orderId} className="payout-row">
                <div>
                  <strong className="payout-row__id">#{order.orderId}</strong>
                  <span className="payout-row__meta">
                    {formatDateShort(order.deliveredAt)} at {formatTimeShort(order.deliveredAt)}
                  </span>
                </div>
                <span className="payout-row__amount">
                  +₹{order.payout || earningsSummary.perOrderRate}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="payout-empty-note">
            Completed deliveries will appear here as soon as you mark an order as delivered.
          </p>
        )}
      </section>
    </div>
  );
}
