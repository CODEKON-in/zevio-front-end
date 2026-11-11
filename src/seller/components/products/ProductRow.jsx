import React, { useState } from 'react';

/**
 * Standard Indian FSSAI Veg / Non-Veg Indicator
 */
export function VegIndicator({ isVeg = true, size = 14 }) {
  const color = isVeg ? '#2F7D4A' : '#C8453B';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        border: `1.5px solid ${color}`,
        borderRadius: '3px',
        padding: '1px',
        backgroundColor: '#FFFFFF',
        flexShrink: 0,
      }}
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
      aria-label={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      <span
        style={{
          width: `${size * 0.5}px`,
          height: `${size * 0.5}px`,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
    </span>
  );
}

export default function ProductRow({
  product,
  onToggleStock,
  onEdit,
  onDelete,
}) {
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const inStock = product.inStock !== false;

  const handleStockClick = async (e) => {
    e.stopPropagation();
    try {
      setIsUpdatingStock(true);
      await onToggleStock(product.id, !inStock);
    } catch (err) {
      alert(`Could not update stock: ${err.message}`);
    } finally {
      setIsUpdatingStock(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: '12px 10px 12px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'all var(--transition-fast)',
        backgroundColor: inStock ? 'var(--cream-card)' : '#FBF7F0',
      }}
    >
      {/* Product Image Thumbnail */}
      <div
        className="product-thumb"
        style={{
          width: '46px',
          height: '46px',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          backgroundColor: 'var(--mango-50)',
          border: '1px solid var(--line)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: inStock ? 1 : 0.55,
        }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mango-600)" strokeWidth="1.8">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        )}
      </div>

      {/* Middle info. Dimmed when the item is off the menu — but the controls
          beside it stay at full strength, or they read as disabled. */}
      <div style={{ flex: 1, minWidth: 0, opacity: inStock ? 1 : 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <VegIndicator isVeg={product.isVeg !== false} />
          <h4
            style={{
              fontSize: '14.5px',
              fontWeight: 700,
              color: 'var(--ink-900)',
              /* Two lines if it needs them: a cut-off dish name helps nobody. */
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.25,
            }}
          >
            {product.name}
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '15px',
              fontWeight: 800,
              color: 'var(--ink-900)',
            }}
          >
            ₹{Number(product.price || 0).toFixed(0)}
          </span>

          {product.category && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                color: 'var(--ink-600)',
                backgroundColor: 'var(--mango-50)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--line)',
                whiteSpace: 'nowrap',
                maxWidth: '90px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {product.category}
            </span>
          )}

          {product.minOrderQty > 1 && (
            <span style={{ fontSize: '10.5px', color: 'var(--ink-400)', fontWeight: 600 }}>
              Min {product.minOrderQty}
            </span>
          )}

          {/* Say it in words. A dimmed row and a grey switch are easy to miss. */}
          {!inStock && (
            <span className="badge badge-error" style={{ fontSize: '10.5px', padding: '2px 8px' }}>
              Out of stock
            </span>
          )}
        </div>
      </div>

      {/* Right Actions: In-Stock Toggle + Edit + Delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        {/* In-stock switch. It has to read as a switch at a glance on a
            390px phone, so it is a track and a knob, not a dot: the old
            version hid its IN/OUT label below 420px and left a bare circle. */}
        <button
          type="button"
          role="switch"
          aria-checked={inStock}
          onClick={handleStockClick}
          disabled={isUpdatingStock}
          className="stock-switch"
          style={{
            minHeight: 'var(--touch-target-min)',
            minWidth: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 2px',
            background: 'none',
            cursor: isUpdatingStock ? 'wait' : 'pointer',
            opacity: isUpdatingStock ? 0.6 : 1,
          }}
          title={inStock ? 'On the menu — tap to mark out of stock' : 'Out of stock — tap to put it back on the menu'}
          aria-label={inStock ? 'Mark out of stock' : 'Mark in stock'}
        >
          <span
            aria-hidden="true"
            style={{
              width: '40px',
              height: '24px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: inStock ? 'var(--success)' : 'var(--line)',
              border: `1px solid ${inStock ? 'var(--success)' : 'var(--line)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-xs)',
                transform: inStock ? 'translateX(16px)' : 'translateX(0)',
                transition: 'transform var(--transition-fast)',
              }}
            />
          </span>
        </button>

        {/* Edit Button */}
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="btn-icon"
          style={{ width: '40px', height: '44px', minWidth: '40px', minHeight: '44px', padding: 0 }}
          title="Edit item"
          aria-label="Edit item"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onDelete(product)}
          className="btn-icon"
          style={{ width: '40px', height: '44px', minWidth: '40px', minHeight: '44px', padding: 0, color: 'var(--error)' }}
          title="Delete item"
          aria-label="Delete item"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <style>{`
        @media (max-width: 380px) {
          .product-thumb {
            width: 44px !important;
            height: 44px !important;
          }
        }
      `}</style>
    </div>
  );
}
