import Spinner from './Spinner.jsx';
import { cx } from '../../utils/format.js';
import s from './Button.module.css';

/**
 * Button
 * Props:
 *  - variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'  (default 'primary')
 *  - size: 'sm' | 'md' | 'lg'  (md/lg are 48px+ tall; sm is 40px visually but keeps a 48px tap area)
 *  - block: boolean — full width
 *  - loading: boolean — shows a spinner and blocks clicks
 *  - iconLeft / iconRight: ReactNode
 *  - as: 'button' | 'a' — use as="a" with href for tel:, upi: and WhatsApp links
 *  - any other prop is passed to the element (onClick, href, aria-*, …)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  iconLeft,
  iconRight,
  as: Tag = 'button',
  className,
  disabled,
  type,
  children,
  ...rest
}) {
  const isButton = Tag === 'button';
  const elementProps = isButton
    ? { type: type || 'button', disabled: disabled || loading }
    : { 'aria-disabled': disabled || undefined, tabIndex: disabled ? -1 : undefined };

  return (
    <Tag
      className={cx(s.btn, s[variant], s[size], block && s.block, (disabled || loading) && s.inactive, className)}
      aria-busy={loading || undefined}
      {...elementProps}
      {...rest}
    >
      {loading ? <Spinner size={18} /> : iconLeft}
      {children != null && <span className={s.label}>{children}</span>}
      {!loading && iconRight}
    </Tag>
  );
}
