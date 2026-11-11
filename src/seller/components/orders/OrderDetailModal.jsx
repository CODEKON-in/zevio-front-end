import { addressLines, orderNote, orderNumber, paymentLabel, paymentState } from '../../utils/orderDisplay';
import React from 'react';

const STATUS_BADGE = {
  new: 'badge-mango',
  preparing: 'badge-warning',
  ready: 'badge-success',
  completed: 'badge-neutral',
  rejected: 'badge-error',
};

export default function OrderDetailModal({
  isOpen,
  order,
  onClose,
  onAccept,
  onOpenReject,
  onMarkReady,
  isActionLoading,
  readOnly = false,
}) {
  if (!isOpen || !order) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const status = order.normalizedStatus || 'new';
  const address = addressLines(order);
  const note = orderNote(order);
  const payment = paymentState(order);

  const formatCurrency = (amt) => {
    const val = Number(amt || 0);
    return `₹${val.toFixed(0)}`;
  };

  const formattedTime = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        backgroundColor: 'rgba(42, 33, 22, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: '24px 20px',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          boxShadow: 'var(--shadow-lg)',
          backgroundColor: 'var(--cream-card)',
          borderBottom: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer drag handle for mobile */}
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'var(--line)',
            borderRadius: '2px',
            margin: '0 auto 16px auto',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '20px', color: 'var(--ink-900)' }}>
                Order #{orderNumber(order)}
              </h2>
              <span className={`badge ${STATUS_BADGE[status] || 'badge-mango'}`}>
                {status.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-600)' }}>
              Placed at {formattedTime}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Close dialog"
            style={{ width: '36px', height: '36px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Customer & Delivery Section */}
        <div
          style={{
            backgroundColor: 'var(--mango-50)',
            border: '1px solid var(--mango-100)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--ink-900)' }}>
              {order.customerName || order.customer?.name || 'Customer'}
            </span>
            {order.customerPhone || order.customer?.phone ? (
              <a
                href={`tel:${order.customerPhone || order.customer?.phone}`}
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--mango-text)',
                  textDecoration: 'underline',
                }}
              >
                {order.customerPhone || order.customer?.phone}
              </a>
            ) : null}
          </div>

          {/* Where it is going. Door and street first: that is what the rider reads. */}
          <div style={{ fontSize: '13.5px', color: 'var(--ink-600)', lineHeight: 1.45 }}>
            {address.street ? (
              <div style={{ color: 'var(--ink-900)', fontWeight: 700 }}>{address.street}</div>
            ) : null}
            {address.area ? <div>{address.area}</div> : null}
            {address.landmark ? <div>Landmark: {address.landmark}</div> : null}
          </div>

          {note ? (
            <div
              style={{
                backgroundColor: 'var(--cream-card)',
                border: '1px solid var(--mango-500)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                fontSize: '13px',
                color: 'var(--ink-900)',
                lineHeight: 1.4,
              }}
            >
              <strong>Customer note:</strong> {note}
            </div>
          ) : null}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: '4px', fontSize: '12.5px', fontWeight: 700 }}>
            <span style={{ color: 'var(--ink-900)' }}>
              Payment: <span style={{ color: 'var(--ink-600)' }}>{paymentLabel(order.paymentMethod)}</span>
            </span>
            <span style={{ color: payment.paid ? 'var(--success)' : 'var(--warning)' }}>
              {payment.label}
            </span>
          </div>
        </div>

        {/* Items List */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-900)', marginBottom: '10px' }}>
            Order Items ({items.length || 1})
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.length > 0 ? (
              items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--line-light)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: 'var(--mango-100)',
                        color: 'var(--mango-text)',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {it.quantity || it.qty || 1}x
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-900)' }}>
                      {it.name || it.title || 'Item'}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-900)' }}>
                    {formatCurrency((it.price || 0) * (it.quantity || it.qty || 1))}
                  </span>
                </div>
              ))
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--line-light)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span>{order.itemSummary || 'Order Items'}</span>
                <span>{formatCurrency(order.totalAmount || order.total)}</span>
              </div>
            )}
          </div>

          {/* Total summary */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1.5px dashed var(--line)',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink-900)' }}>
              Grand Total
            </span>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--ink-900)',
              }}
            >
              {formatCurrency(order.totalAmount || order.total || order.subtotal)}
            </span>
          </div>
        </div>

        {/* Action Buttons depending on status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
          {!readOnly && status === 'new' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => onOpenReject(order)}
                disabled={isActionLoading}
                className="btn-secondary"
                style={{
                  flex: 1,
                  color: 'var(--error)',
                  borderColor: 'rgba(200, 69, 59, 0.3)',
                }}
              >
                Reject Order
              </button>
              <button
                type="button"
                onClick={() => onAccept(order.id)}
                disabled={isActionLoading}
                className="btn-primary"
                style={{ flex: 1.5 }}
              >
                {isActionLoading ? 'Accepting...' : 'Accept Order'}
              </button>
            </div>
          )}

          {!readOnly && status === 'preparing' && (
            <button
              type="button"
              onClick={() => onMarkReady(order.id)}
              disabled={isActionLoading}
              className="btn-primary btn-success"
              style={{ width: '100%' }}
            >
              {isActionLoading ? 'Updating...' : '✓ Mark as Ready'}
            </button>
          )}

          {status === 'ready' && (
            <div
              style={{
                padding: '12px',
                textAlign: 'center',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success)',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(47, 125, 74, 0.25)',
              }}
            >
              Ready for pickup! Waiting for delivery partner.
            </div>
          )}

          {status === 'rejected' && (
            <div
              style={{
                padding: '12px',
                textAlign: 'center',
                backgroundColor: 'var(--error-bg)',
                color: 'var(--error)',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(200, 69, 59, 0.25)',
              }}
            >
              Order rejected: "{order.rejectionReason || 'Shop unable to fulfill'}"
            </div>
          )}

          {status === 'completed' && (
            <div
              style={{
                padding: '12px',
                textAlign: 'center',
                backgroundColor: 'var(--mango-50)',
                color: 'var(--mango-text)',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--mango-100)',
              }}
            >
              Delivered and completed successfully.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

