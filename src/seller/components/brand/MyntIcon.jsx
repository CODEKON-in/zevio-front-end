import './MyntIcon.css';

/** The two small side veins are dropped below this icon height (px). */
const VEIN_MIN_PX = 32;

/**
 * The Mynt icon — a mango location pin with a dark leaf inside (fresh, and
 * delivered to your door). The artwork is fixed; only its colours change by
 * variant, and those come from CSS variables (MyntIcon.css).
 *
 * Props:
 *  - size: height in px (default 40); the width follows the 100 × 120 artwork
 *  - variant: 'default' (light background) | 'onMango' | 'onDark'
 *  - className
 *  - title: accessible name (default "Mynt"); pass title={null} when the icon
 *    sits inside something that is already labelled
 */
export default function MyntIcon({ size = 40, variant = 'default', className = '', title = 'Mynt' }) {
  const labelled = title !== null && title !== '';
  return (
    <svg
      className={`mynt-icon mynt-icon--${variant} ${className}`}
      width={(size * 100) / 120}
      height={size}
      viewBox="0 0 100 120"
      {...(labelled ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: 'false' })}
    >
      <path className="mynt-pin" d="M50 4C26 4 8 22 8 46c0 30 42 70 42 70s42-40 42-70C92 22 74 4 50 4z" />
      <g className="mynt-leaf" transform="rotate(-35 50 46)">
        <path className="mynt-leaf-body" d="M50 20c17 9 21 29 0 52C29 49 33 29 50 20z" />
        <path className="mynt-vein" d="M50 26v42" strokeWidth="3" strokeLinecap="round" />
        {size >= VEIN_MIN_PX && <path className="mynt-vein" d="M50 40l-8-6M50 52l8-6" strokeWidth="2.4" strokeLinecap="round" />}
      </g>
    </svg>
  );
}
