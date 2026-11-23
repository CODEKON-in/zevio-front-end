import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { formatRelativeTime, getTotalItemUnits } from '../utils/dateUtils';

export default function OrderCard({ order }) {
  const totalUnits = getTotalItemUnits(order.items);

  return (
    <Link to={`/delivery/orders/${order.orderId}`} className={`order-card order-card--${order.status}`}>
      <div className="order-card__top">
        <div className="order-card__id-group">
          <span className="order-card__id">#{order.orderId}</span>
          <span className="order-card__time">{formatRelativeTime(order.assignedAt)}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="order-card__body">
        <div className="order-card__route-row">
          <span className="route-tag route-tag--pickup">PICKUP</span>
          <div className="route-info">
            <strong className="route-title">{order.shopName}</strong>
          </div>
        </div>

        <div className="order-card__route-row">
          <span className="route-tag route-tag--drop">DROP</span>
          <div className="route-info">
            <strong className="route-title">{order.customerName}</strong>
            <p className="route-address">{order.deliveryAddress}</p>
          </div>
        </div>
      </div>

      <div className="order-card__footer">
        <span className="order-card__items-pill">
          {order.items.length} {order.items.length === 1 ? 'item' : 'items'} ({totalUnits} units)
        </span>
        {order.issueReported && (
          <span className="order-card__issue-flag">Issue Reported</span>
        )}
        <span className="order-card__cta">
          View Details <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

