/**
 * The Zevio mango — the same drawing as the HTML splash and the favicon.
 * Its colours are the logo tokens in variables.css.
 */
export default function MangoMark({ size = 64, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M33 15c-1.6-3-3.4-5-6-6.4" fill="none" style={{ stroke: 'var(--logo-stem)' }} strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M34 15.5c11.6 0 21 9.4 21 21.3C55 48.3 45.6 56 33.4 56 22.4 56 13 49.6 13 39.4c0-7.2 4.4-11.6 9.6-14.6C27 22.3 28.4 15.5 34 15.5Z"
        style={{ fill: 'var(--mango-500)' }}
      />
      <path d="M45 26c3.4 3 5 6.6 5 10.6" fill="none" style={{ stroke: 'var(--mango-50)' }} strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <path d="M33.6 15.2c1.6-5.8 6.4-9 13.4-8.6-1.4 6.8-6.4 9.8-13.4 8.6Z" style={{ fill: 'var(--logo-leaf)' }} />
    </svg>
  );
}
