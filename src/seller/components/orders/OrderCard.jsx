import React from 'react';
import { orderNumber } from '../../utils/orderDisplay';

/* A badge that disagrees with the words under it is worse than no badge. */
const STATUS_BADGE = {
  new: 'badge-mango',
  preparing: 'badge-warning',
  ready: 'badge-success',
  completed: 'badge-neutral',
  rejected: 'badge-error',
};

export default function OrderCard({
  order,
  isNewlyArrived = false,
  readOnly = false,
  onViewDetails,
  onAccept,
  onOpenReject,
  onMarkReady,
  isActionLoading = false,
}) {
  const status = order.normalizedStatus || 'new';
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, it) => sum + (it.quantity || it.qty || 1), 0)
    : order.itemCount || 1;

  /** "4× Idli · 4× Parotta" — the dishes, in the order they were added. */
  const itemSummary = Array.isArray(order.items)
    ? order.items
        .map((it) => `${it.quantity || it.qty || 1}× ${it.name || it.productName || 'Item'}`)
        .join(' · ')
    : '';

  const total = Number(order.totalAmount || order.total || order.subtotal || 0);

  const formattedTime = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div
      className={`card ${isNewlyArrived ? 'new-order-pulse' : ''}`}
      style={{
        cursor: 'pointer',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        border: isNewlyArrived
          ? '2px solid var(--mango-500)'
          : '1px solid var(--line)',
        boxShadow: isNewlyArrived ? 'var(--shadow-mango)' : 'var(--shadow-sm)',
        transition: 'all var(--transition-fast)',
      }}
      onClick={() => onViewDetails(order)}
    >
      {/* Top Row: Customer Name & Time + Status Pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: 'var(--ink-900)',
              marginBottom: '2px',
            }}
          >
            {order.customerName || order.customer?.name || 'Customer'}
          </h3>
          <span style={{ fontSize: '12.5px', color: 'var(--ink-600)' }}>
            #{orderNumber(order)} • {formattedTime}
          </span>
        </div>

        <span
          className={`badge ${STATUS_BADGE[status] || 'badge-mango'}`}
        >
          {status.toUpperCase()}
        </span>
      </div>

      {/* Middle Row: Items summary & Total */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '8px',
          padding: '10px 12px',
          backgroundColor: 'var(--mango-50)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {/* What was actually ordered. A count alone ("8 items") makes the cook
            open every card to find out what to start, so the dishes go on the
            card and the count only fills in when the items aren't loaded. */}
        <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-600)', minWidth: 0, paddingRight: '10px' }}>
          {itemSummary || `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          {order.deliveryArea ? ` • ${order.deliveryArea}` : ''}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '18px',
            fontWeight: 800,
            color: 'var(--ink-900)',
            whiteSpace: 'nowrap',
          }}
        >
          ₹{total.toFixed(0)}
        </span>
      </div>

      {/* Action buttons (click stopPropagation so it doesn't just trigger viewDetails) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingTop: '4px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!readOnly && status === 'new' && (
          <>
            <button
              type="button"
              onClick={() => onOpenReject(order)}
              disabled={isActionLoading}
              className="btn-secondary"
              style={{
                minHeight: 'var(--touch-target-min)',
                padding: '0 14px',
                fontSize: '13.5px',
                color: 'var(--error)',
                borderColor: 'rgba(200, 69, 59, 0.3)',
              }}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => onAccept(order.id)}
              disabled={isActionLoading}
              className="btn-primary"
              style={{
                minHeight: 'var(--touch-target-min)',
                padding: '0 18px',
                fontSize: '13.5px',
              }}
            >
              {isActionLoading ? '...' : 'Accept'}
            </button>
          </>
        )}

        {!readOnly && status === 'preparing' && (
          <button
            type="button"
            onClick={() => onMarkReady(order.id)}
            disabled={isActionLoading}
            className="btn-primary btn-success"
            style={{
              minHeight: 'var(--touch-target-min)',
              padding: '0 18px',
              fontSize: '13.5px',
            }}
          >
            {isActionLoading ? '...' : '✓ Mark as Ready'}
          </button>
        )}

        {status === 'ready' && (
          <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 700 }}>
            Awaiting pickup
          </span>
        )}

        {/* History shows live orders too, but they are handled on the Orders tab. */}
        {readOnly && (status === 'new' || status === 'preparing') && (
          <span style={{ fontSize: '12px', color: 'var(--ink-400)', fontWeight: 600 }}>
            {status === 'new' ? 'Waiting to be accepted' : 'Being prepared'}
          </span>
        )}

        {status === 'completed' && (
          <span style={{ fontSize: '12px', color: 'var(--ink-400)', fontWeight: 600 }}>
            Completed
          </span>
        )}

        {status === 'rejected' && (
          <span style={{ fontSize: '12px', color: 'var(--error)', fontWeight: 600 }}>
            Rejected
          </span>
        )}
      </div>

      <style>{`
        @keyframes orderPulse {
          0% { box-shadow: 0 0 0 0 rgba(242, 180, 58, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(242, 180, 58, 0); }
          100% { box-shadow: 0 0 0 0 rgba(242, 180, 58, 0); }
        }
        .new-order-pulse {
          animation: orderPulse 2s infinite;
        }
      `}</style>
    </div>
  );
}

