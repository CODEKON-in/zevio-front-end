import React from 'react';

export default function OrderSkeleton({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '120px', height: '18px' }} />
            <div className="skeleton" style={{ width: '60px', height: '22px', borderRadius: '12px' }} />
          </div>
          <div className="skeleton" style={{ width: '85%', height: '14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <div className="skeleton" style={{ width: '80px', height: '22px' }} />
            <div className="skeleton" style={{ width: '100px', height: '36px', borderRadius: '10px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

