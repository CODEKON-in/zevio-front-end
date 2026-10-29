import { cx } from '../../utils/format.js';
import s from './Card.module.css';

/**
 * Card — white surface with border and radius.
 * Props:
 *  - as: element/component to render (default 'div'; use 'button', 'li', 'article' or Link)
 *  - interactive: boolean — hover/press styles (use when the whole card is tappable)
 *  - padding: 'none' | 'sm' | 'md' | 'lg' (default 'md')
 *  - muted: boolean — greyed out (e.g. closed shops)
 *  - className, children, and other props for the element
 */
export default function Card({ as: Tag = 'div', interactive = false, padding = 'md', muted = false, className, children, ...rest }) {
  return (
    <Tag className={cx(s.card, s[`pad-${padding}`], interactive && s.interactive, muted && s.muted, className)} {...rest}>
      {children}
    </Tag>
  );
}
