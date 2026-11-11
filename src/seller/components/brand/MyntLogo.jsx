import MyntIcon from './MyntIcon.jsx';
import './MyntLogo.css';

/**
 * The Mynt lockup: the icon to the left of the lowercase wordmark "mynt".
 * Proportions follow the brand: icon height ≈ 1.35 × the wordmark size,
 * gap ≈ 0.25 × the wordmark size.
 *
 * One labelled element for screen readers ("Mynt"); the icon and the visible
 * text inside are hidden from them so the name is not read twice.
 *
 * Props:
 *  - size: wordmark font-size in px (default 28). A className can still
 *    change it per breakpoint by setting --mynt-size.
 *  - variant: 'default' | 'onMango' | 'onDark'
 *  - showIcon: default true
 *  - className
 */
export default function MyntLogo({ size = 28, variant = 'default', showIcon = true, className = '' }) {
  return (
    <span className={`mynt-logo mynt-logo--${variant} ${className}`} style={{ '--mynt-size-base': `${size}px` }} role="img" aria-label="Mynt">
      {showIcon && <MyntIcon size={Math.round(size * 1.35)} variant={variant} title={null} className="mynt-logo-icon" />}
      <span className="mynt-logo-word" aria-hidden="true">
        mynt
      </span>
    </span>
  );
}
