/**
 * Small helpers for the few animations that need JavaScript (element.animate).
 * Everything else is CSS. Every helper does nothing when the person has asked
 * for reduced motion, and none of them ever delays what the tap actually does.
 */

/** True unless the OS asks for reduced motion. */
export function prefersMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

/**
 * "Fly to cart": a small round clone of the product photo arcs from `fromEl`
 * to the element marked [data-cart-target], then removes itself. Fire and
 * forget — the item is already in the cart before this starts.
 */
export function flyToCart(fromEl) {
  if (!fromEl || !prefersMotion()) return;
  // The cart bar may only render on the next frame (first item added).
  requestAnimationFrame(() => {
    const target = document.querySelector('[data-cart-target]');
    if (!target) return;
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    if (!a.width || !b.width) return;

    const size = 44;
    const dot = document.createElement('div');
    dot.setAttribute('aria-hidden', 'true');
    dot.className = 'fly-dot';
    const img = fromEl.querySelector('img');
    if (img?.currentSrc || img?.src) dot.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    const x0 = a.left + a.width / 2 - size / 2;
    const y0 = a.top + a.height / 2 - size / 2;
    const x1 = b.left + b.width / 2 - size / 2;
    const y1 = b.top + b.height / 2 - size / 2;
    dot.style.left = `${x0}px`;
    dot.style.top = `${y0}px`;
    document.body.appendChild(dot);

    // A curve: rise first, then fall onto the cart. Translate only.
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lift = Math.min(-60, dy * 0.15 - 80);
    const anim = dot.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.35}px, ${lift}px) scale(0.9)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0.6 },
      ],
      { duration: 620, easing: 'cubic-bezier(.45,0,.25,1)' },
    );
    const done = () => dot.remove();
    anim.onfinish = done;
    anim.oncancel = done;
    setTimeout(done, 1000);
  });
}

/** A one-off bounce on an element (the cart badge after an item lands). */
export function bounce(el, delay = 0) {
  if (!el || !prefersMotion()) return;
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1)' }],
    { duration: 450, delay, easing: 'cubic-bezier(.34,1.56,.64,1)' },
  );
}
