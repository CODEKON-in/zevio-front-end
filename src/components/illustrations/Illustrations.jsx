/*
 * Small inline illustrations — no image files, nothing to download. Each is a
 * flat, friendly drawing in the mango palette, sized by its `size` prop.
 * They are decorative: aria-hidden, with the meaning carried by nearby text.
 */
import s from './Illustrations.module.css';

function Art({ size = 96, viewBox = '0 0 120 120', className = '', children }) {
  return (
    <svg className={`${s.art} ${className}`} width={size} height={size} viewBox={viewBox} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const Ground = () => <ellipse className={s.shadow} cx="60" cy="104" rx="34" ry="5" />;

/** An empty basket — empty cart. */
export function EmptyCartArt({ size }) {
  return (
    <Art size={size}>
      <Ground />
      <path className={s.mangoLight} d="M22 46h76l-8 46a8 8 0 0 1-8 7H38a8 8 0 0 1-8-7Z" />
      <path className={s.mango} d="M18 40h84a4 4 0 0 1 0 8H18a4 4 0 0 1 0-8Z" />
      <path className={s.stroke} d="M40 40 52 20M80 40 68 20" />
      <path className={s.strokeSoft} d="M46 62v22M60 62v22M74 62v22" />
    </Art>
  );
}

/** A paper bag with a receipt — no orders yet. */
export function NoOrdersArt({ size }) {
  return (
    <Art size={size}>
      <Ground />
      <path className={s.mango} d="M30 40h60l6 58a4 4 0 0 1-4 4H28a4 4 0 0 1-4-4Z" />
      <path className={s.mangoDark} d="M30 40h60l1 10H29Z" />
      <path className={s.stroke} d="M46 46v-8a14 14 0 0 1 28 0v8" />
      <rect className={s.cream} x="62" y="58" width="26" height="34" rx="3" transform="rotate(8 75 75)" />
      <path className={s.strokeSoft} d="M68 68h14M67 76h14M66 84h10" transform="rotate(8 75 75)" />
    </Art>
  );
}

/** A magnifier over a plate — nothing found. */
export function NothingFoundArt({ size }) {
  return (
    <Art size={size}>
      <Ground />
      <ellipse className={s.mangoLight} cx="56" cy="80" rx="36" ry="12" />
      <ellipse className={s.cream} cx="56" cy="78" rx="24" ry="7" />
      <circle className={s.mango} cx="70" cy="46" r="20" />
      <circle className={s.cream} cx="70" cy="46" r="13" />
      <path className={s.stroke} d="M84 60 98 74" strokeWidth="6" />
    </Art>
  );
}

/** A small shop front — no shops. */
export function NoShopsArt({ size }) {
  return (
    <Art size={size}>
      <Ground />
      <rect className={s.mangoLight} x="26" y="50" width="68" height="50" rx="4" />
      <path className={s.mango} d="M20 34h80l4 16a10 10 0 0 1-20 2 10 10 0 0 1-20 0 10 10 0 0 1-20 0 10 10 0 0 1-20-2Z" />
      <rect className={s.cream} x="50" y="70" width="20" height="30" rx="3" />
      <rect className={s.cream} x="32" y="64" width="12" height="12" rx="2" />
      <rect className={s.cream} x="76" y="64" width="12" height="12" rx="2" />
    </Art>
  );
}

/** A rain cloud — something went wrong. */
export function ErrorArt({ size }) {
  return (
    <Art size={size}>
      <Ground />
      <path className={s.mangoLight} d="M34 74a16 16 0 0 1 4-31 22 22 0 0 1 42-4 18 18 0 0 1 6 35Z" />
      <path className={s.stroke} d="M48 84l-4 8M62 84l-4 8M76 84l-4 8" />
      <path className={s.stroke} d="M52 56h0M70 56h0" strokeWidth="5" />
      <path className={s.stroke} d="M54 66q7-5 14 0" />
    </Art>
  );
}

/* ---- Order status --------------------------------------------------------- */

function Receipt() {
  return (
    <>
      <path className={s.cream} d="M38 22h44v74l-6-4-5 4-5-4-6 4-5-4-6 4-5-4-6 4Z" />
      <path className={s.mango} d="M38 22h44v12H38Z" />
      <path className={s.strokeSoft} d="M46 48h28M46 58h28M46 68h18" />
    </>
  );
}

function Pot() {
  return (
    <>
      <path className={s.steam + ' ' + s.strokeSoft} d="M46 40q-4-8 0-14" style={{ strokeDasharray: 'none', stroke: 'var(--line-strong)' }} />
      <path className={s.steam + ' ' + s.strokeSoft} d="M60 38q-4-8 0-14" style={{ strokeDasharray: 'none', stroke: 'var(--line-strong)' }} />
      <path className={s.steam + ' ' + s.strokeSoft} d="M74 40q-4-8 0-14" style={{ strokeDasharray: 'none', stroke: 'var(--line-strong)' }} />
      <path className={s.mango} d="M28 52h64v26a18 18 0 0 1-18 18H46a18 18 0 0 1-18-18Z" />
      <rect className={s.mangoDark} x="24" y="46" width="72" height="8" rx="4" />
      <path className={s.stroke} d="M20 62h8M92 62h8" />
    </>
  );
}

function Scooter() {
  return (
    <>
      <g className={s.road}>
        <path className={s.strokeSoft} d="M0 104h140" />
      </g>
      <g className={s.bob} style={{ transformOrigin: '60px 96px' }}>
        <circle className={s.ink} cx="36" cy="92" r="10" />
        <circle className={s.cream} cx="36" cy="92" r="4" />
        <circle className={s.ink} cx="86" cy="92" r="10" />
        <circle className={s.cream} cx="86" cy="92" r="4" />
        <path className={s.mango} d="M30 84h40l8-24h10l-6 30H30Z" />
        <rect className={s.mangoDark} x="26" y="56" width="30" height="24" rx="5" />
        <path className={s.cream} d="M32 62h18v4H32Z" />
        <path className={s.stroke} d="M84 60l4-12h8" />
      </g>
    </>
  );
}

function House() {
  return (
    <>
      <path className={s.mangoLight} d="M30 58 60 32l30 26v40H30Z" />
      <path className={s.mango} d="M24 60 60 28l36 32-5 5-31-27-31 27Z" />
      <rect className={s.cream} x="52" y="72" width="16" height="26" rx="3" />
      <circle className={s.green} cx="88" cy="36" r="14" />
      <path className={s.strokeCream} d="m81 36 5 5 9-10" />
    </>
  );
}

function Cancelled() {
  return (
    <>
      <circle className={s.mangoLight} cx="60" cy="58" r="34" />
      <circle className={s.red} cx="60" cy="58" r="22" />
      <path className={s.strokeCream} d="m51 49 18 18M69 49 51 67" />
    </>
  );
}

/** The large picture at the top of order tracking, one per status. */
export function OrderStatusArt({ status, size = 132 }) {
  const art = {
    PENDING: <Receipt />,
    CONFIRMED: <Receipt />,
    PREPARING: <Pot />,
    OUT_FOR_DELIVERY: <Scooter />,
    DELIVERED: <House />,
    CANCELLED: <Cancelled />,
  }[status] || <Receipt />;
  return (
    <Art size={size}>
      {status !== 'OUT_FOR_DELIVERY' && <Ground />}
      {art}
    </Art>
  );
}
