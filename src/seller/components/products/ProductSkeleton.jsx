import React from 'react';

export default function ProductSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
          }}
        >
          <div className="skeleton" style={{ width: '56px', height: '56px', borderRadius: '10px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="skeleton" style={{ width: '45%', height: '16px' }} />
            <div className="skeleton" style={{ width: '30%', height: '14px' }} />
          </div>
          <div className="skeleton" style={{ width: '48px', height: '28px', borderRadius: '14px' }} />
        </div>
      ))}
    </div>
  );
}

