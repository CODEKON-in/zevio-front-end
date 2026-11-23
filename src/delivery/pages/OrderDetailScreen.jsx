import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { useDelivery } from '../context/DeliveryContext';
import { fetchOrderDetailsFromBackend } from '../services/deliveryService';
import { ORDER_STATUS_CONFIG, ISSUE_REASONS } from '../data/mockData';
import {
  formatTimeShort,
  formatDateShort,
  getGoogleMapsDirectionsUrl,
  getTotalItemUnits
} from '../utils/dateUtils';

const STEPS = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' }
];

export default function OrderDetailScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, updateOrderStatus, reportIssue, partner } = useDelivery();

  const contextOrder = orders.find(
    (o) => o.orderId === orderId || o.id === orderId || o.order_number === orderId
  );
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [loading, setLoading] = useState(!contextOrder);

  useEffect(() => {
    if (contextOrder) {
      setFetchedOrder(contextOrder);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchOrderDetailsFromBackend(orderId, partner?.uid).then((data) => {
      if (active) {
        if (data) setFetchedOrder(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [orderId, contextOrder, partner?.uid]);

  const order = contextOrder || fetchedOrder;

  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [selectedReason, setSelectedReason] = useState(ISSUE_REASONS[0]);
  const [issueNote, setIssueNote] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState('');
  const bannerTimerRef = useRef(null);

  // Reset transient UI state whenever the viewed order changes
  useEffect(() => {
    setShowIssuePanel(false);
    setSelectedReason(ISSUE_REASONS[0]);
    setIssueNote('');
    setFeedbackBanner('');
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [orderId]);

  const showTransientBanner = (msg) => {
    setFeedbackBanner(msg);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setFeedbackBanner(''), 4000);
  };

  const handleBack = () => {
    // Stay inside MYNT Delivery if the user landed on this order URL directly
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/delivery/orders');
    }
  };

  if (loading && !order) {
    return (
      <div className="screen-container">
        <div className="empty-state">
          <p className="empty-state__desc">Loading order #{orderId}…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="screen-container">
        <div className="empty-state">
          <h2 className="empty-state__title">Order #{orderId} not found</h2>
          <p className="empty-state__desc">This order may have been reassigned or removed.</p>
          <Link to="/delivery/orders" className="btn btn--primary">
            Back to Active Orders
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusCfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.assigned;
  const currentStepIndex = STEPS.findIndex((s) => s.key === order.status);
  const totalUnits = getTotalItemUnits(order.items);
  const isCompleted = order.status === 'delivered';

  const handleAdvanceStatus = () => {
    if (!currentStatusCfg.nextStatus) return;
    const nextStatus = currentStatusCfg.nextStatus;
    updateOrderStatus(order.orderId, nextStatus);
    const nextLabel = ORDER_STATUS_CONFIG[nextStatus]?.label || nextStatus;
    showTransientBanner(`Order status updated to "${nextLabel}"`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    reportIssue(order.orderId, selectedReason, issueNote);
    setShowIssuePanel(false);
    setIssueNote('');
    showTransientBanner('Issue reported to MYNT Dispatch Hub');
  };

  return (
    <div className="screen-container detail-screen">
      {/* Back Header */}
      <div className="detail-nav">
        <button type="button" className="back-btn" onClick={handleBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        <span className="detail-nav__time">
          Assigned {formatTimeShort(order.assignedAt)}
        </span>
      </div>

      {feedbackBanner && (
        <div className="alert-box alert-box--success" role="status" aria-live="polite">
          {feedbackBanner}
        </div>
      )}

      {/* Order Header Card */}
      <section className="detail-card detail-card--header">
        <div className="detail-header-row">
          <div>
            <span className="detail-order-label">ORDER ID</span>
            <h1 className="detail-order-id">#{order.orderId}</h1>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Visual Step Progress */}
        <div className="status-stepper" aria-label="Order progress">
          {STEPS.map((step, index) => {
            const isDone = index <= currentStepIndex;
            const isCurrent = !isCompleted && index === currentStepIndex;
            return (
              <div
                key={step.key}
                className={`stepper-item ${isDone ? 'stepper-item--done' : ''} ${
                  isCurrent ? 'stepper-item--current' : ''
                }`}
              >
                <div className="stepper-circle">{isDone ? '✓' : index + 1}</div>
                <span className="stepper-label">{step.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Primary Status Action Button (Large Tap Target for Riders) */}
      <section className="primary-action-box">
        {currentStatusCfg.nextStatus ? (
          <button
            type="button"
            className={`btn btn--large btn--full btn--status-${currentStatusCfg.nextStatus}`}
            onClick={handleAdvanceStatus}
          >
            {currentStatusCfg.nextActionLabel} →
          </button>
        ) : (
          <div className="delivered-complete-banner">
            <span className="delivered-complete-banner__icon" aria-hidden="true">✓</span>
            <div>
              <strong>Delivered Successfully</strong>
              <p>
                Completed on {formatDateShort(order.deliveredAt)} at{' '}
                {formatTimeShort(order.deliveredAt)}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Customer Delivery Details Card */}
      <section className="detail-card">
        <div className="card-section-header">
          <span className="route-tag route-tag--drop">CUSTOMER DROP</span>
          <span className="card-section-subtitle">Delivery Location</span>
        </div>

        <h2 className="contact-name">{order.customerName}</h2>
        <p className="contact-address">{order.deliveryAddress}</p>

        <div className="action-grid-two">
          <a href={`tel:${order.customerPhone}`} className="btn btn--call">
            <span aria-hidden="true">📞</span> Call Customer
          </a>
          <a
            href={getGoogleMapsDirectionsUrl(order.deliveryAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--directions"
          >
            <span aria-hidden="true">📍</span> Get Directions
          </a>
        </div>
      </section>

      {/* Shop Pickup Details Card */}
      <section className="detail-card">
        <div className="card-section-header">
          <span className="route-tag route-tag--pickup">SHOP PICKUP</span>
          <span className="card-section-subtitle">Pickup Store</span>
        </div>

        <h2 className="contact-name">{order.shopName}</h2>
        <p className="contact-address">{order.shopAddress}</p>

        <div className="action-grid-two">
          <a href={`tel:${order.shopPhone}`} className="btn btn--outline">
            <span aria-hidden="true">📞</span> Call Shop
          </a>
          <a
            href={getGoogleMapsDirectionsUrl(order.shopAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline"
          >
            <span aria-hidden="true">🗺️</span> Shop Map
          </a>
        </div>
      </section>

      {/* Item Checklist Card */}
      <section className="detail-card">
        <div className="card-section-header">
          <h2 className="card-section-title">Order Items ({order.items.length})</h2>
          <span className="items-total-badge">{totalUnits} Total Units</span>
        </div>

        <ul className="item-list">
          {order.items.map((item, idx) => (
            <li key={`${item.name}-${idx}`} className="item-row">
              <span className="item-row__name">{item.name}</span>
              <span className="item-row__qty">× {item.quantity}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Issue Reporting Section */}
      <section className="detail-card detail-card--issue">
        {order.issueReported && (
          <div className="reported-issue-summary">
            <strong>Reported Issue:</strong> {order.issueReported.reason}
            {order.issueReported.note && <p>Note: "{order.issueReported.note}"</p>}
          </div>
        )}

        {!showIssuePanel ? (
          <button
            type="button"
            className="btn btn--issue-toggle btn--full"
            onClick={() => setShowIssuePanel(true)}
          >
            ⚠️ {order.issueReported ? 'Update Reported Issue' : 'Report Issue with Order'}
          </button>
        ) : (
          <form className="issue-form" onSubmit={handleIssueSubmit}>
            <h3 className="issue-form__title">Report Delivery Issue</h3>

            <div className="form-group">
              <label htmlFor="issue-reason" className="form-label">
                Select Reason
              </label>
              <select
                id="issue-reason"
                className="form-select"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
              >
                {ISSUE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="issue-note" className="form-label">
                Additional Note (Optional)
              </label>
              <input
                id="issue-note"
                type="text"
                className="form-input"
                placeholder="e.g. Waited 10 mins near gate"
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
              />
            </div>

            <div className="action-grid-two">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setShowIssuePanel(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--danger">
                Submit Issue
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
