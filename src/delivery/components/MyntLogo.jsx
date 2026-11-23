import React from 'react';

export default function MyntLogo({
  size = 44,
  showWordmark = true,
  subtitle = 'DELIVERY',
  inverted = false
}) {
  const pinFill = inverted ? '#3A2A08' : '#F2B43A';
  const leafFill = inverted ? '#FFFDF8' : '#3A2A08';
  const veinStroke = inverted ? '#3A2A08' : '#F2B43A';

  return (
    <div className={`mynt-brand ${inverted ? 'mynt-brand--inverted' : ''}`}>
      <div
        className="mynt-logo-mark"
        style={{ width: Math.round(size * 0.85), height: size }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 120" width="100%" height="100%" fill="none">
          <path
            d="M50 4C26 4 8 22 8 46c0 30 42 70 42 70s42-40 42-70C92 22 74 4 50 4z"
            fill={pinFill}
          />
          <g transform="rotate(-35 50 46)">
            <path d="M50 20c17 9 21 29 0 52C29 49 33 29 50 20z" fill={leafFill} />
            <path d="M50 26v42" stroke={veinStroke} strokeWidth="3" strokeLinecap="round" />
            <path
              d="M50 40l-8-6M50 52l8-6"
              stroke={veinStroke}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
      {showWordmark && (
        <div className="mynt-brand-text">
          <span className="mynt-wordmark">MYNT</span>
          {subtitle && <span className="mynt-subtitle">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
