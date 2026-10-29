import { useState } from 'react';
import { ImageIcon } from '../icons/Icons.jsx';
import { cx } from '../../utils/format.js';
import s from './SmartImage.module.css';

/**
 * SmartImage — lazy image with a fixed aspect ratio (no layout shift) and a coloured placeholder.
 * If src is missing or fails to load, `fallback` (or an image icon) is shown instead.
 * Props:
 *  - src: string | null
 *  - alt: string (required; use '' for decorative images)
 *  - ratio: CSS aspect-ratio, e.g. '16 / 9', '1 / 1' (default '4 / 3')
 *  - fallback: ReactNode — e.g. <CategoryIcon category="bakery" size={40} />
 *  - rounded: boolean (default true)
 *  - className
 */
export default function SmartImage({ src, alt, ratio = '4 / 3', fallback, rounded = true, className }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = src && !failed;

  return (
    <div className={cx(s.frame, rounded && s.rounded, className)} style={{ aspectRatio: ratio }}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cx(s.img, loaded && s.loaded)}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={s.fallback} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
          {fallback || <ImageIcon size={32} />}
        </div>
      )}
    </div>
  );
}
