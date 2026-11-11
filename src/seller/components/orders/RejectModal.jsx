import React, { useState } from 'react';

const REJECTION_REASONS = [
  'Out of stock',
  'Shop closing soon',
  "Can't fulfill",
  'Kitchen too busy',
  'Delivery area unavailable',
  'Other / Item issue',
];

export default function RejectModal({ isOpen, order, onConfirm, onCancel, isSubmitting }) {
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !order) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other / Item issue' && customReason.trim()
      ? customReason.trim()
      : selectedReason;
    onConfirm(order.id, finalReason);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(42, 33, 22, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--ink-900)' }}>
          Reject Order #{order.id.slice(-5).toUpperCase()}?
        </h3>
        <p style={{ fontSize: '13.5px', color: 'var(--ink-600)', marginBottom: '18px' }}>
          Please select a reason to notify the customer and Mynt delivery team.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              htmlFor="rejection-reason"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--ink-900)',
                marginBottom: '6px',
              }}
            >
              Reason for rejection
            </label>
            <select
              id="rejection-reason"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              style={{
                width: '100%',
                minHeight: 'var(--touch-target-min)',
                padding: '0 12px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--line)',
                backgroundColor: '#FFFFFF',
                color: 'var(--ink-900)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === 'Other / Item issue' && (
            <div>
              <input
                type="text"
                placeholder="Specific note (e.g. power cut)"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                maxLength={80}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-target-min)',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--line)',
                  fontSize: '14px',
                }}
              />
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '10px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                minHeight: 'var(--touch-target-min)',
                padding: '0 16px',
                backgroundColor: 'var(--error)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

