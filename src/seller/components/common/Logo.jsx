import React from 'react';
import MyntLogo from '../brand/MyntLogo.jsx';

/**
 * The Mynt lockup for the seller panel: the brand's own logo, plus a SELLER
 * badge so a shopkeeper can tell at a glance this is the panel and not the
 * customer app.
 *
 * The mark itself is MyntLogo, copied from the customer app and unchanged, so
 * the pin, the leaf, the wordmark and their proportions stay identical in both.
 * Nothing here draws the logo itself.
 *
 * Props:
 *  - size: 'small' | 'medium' (default)
 *  - showBadge: default true
 *  - variant: passed through to MyntLogo ('default' | 'onMango' | 'onDark')
 */
export default function Logo({ size = 'medium', showBadge = true, variant = 'default' }) {
  const wordSize = size === 'small' ? 20 : 24;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
      <MyntLogo size={wordSize} variant={variant} />
      {showBadge && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '10px',
            fontWeight: 'var(--font-weight-black)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            backgroundColor: 'var(--mango-500)',
            backgroundImage: 'var(--grain), var(--mango-fill)',
            backgroundBlendMode: 'multiply, normal',
            color: 'var(--ink-on-mango)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-pill)',
            lineHeight: 1.2,
          }}
        >
          Seller
        </span>
      )}
    </span>
  );
}
