import { memo, useEffect, useRef } from 'react';
import { t } from '../../i18n/index.js';
import Button from '../ui/Button.jsx';
import PriceTag from '../ui/PriceTag.jsx';
import QuantityStepper from '../ui/QuantityStepper.jsx';
import SmartImage from '../ui/SmartImage.jsx';
import VegDot from '../ui/VegDot.jsx';
import { CategoryIcon, PlusIcon } from '../icons/Icons.jsx';
import { lineMin } from '../../utils/productRules.js';
import { flyToCart } from '../../utils/motion.js';
import s from './ProductCard.module.css';

/**
 * ProductCard — one item in a shop menu.
 * Props:
 *  - product: object from productService
 *  - category: shop category (for the image fallback icon)
 *  - qty: number currently in cart
 *  - canOrder: boolean — false when the shop is closed
 *  - onAdd(product), onIncrement(productId), onDecrement(productId), onRemove(productId)
 *  - onOpen(product) — tapping the name or photo opens the detail sheet
 *
 * The card stays compact so a long menu is quick to scan: the description is
 * one line here, in full in the sheet.
 */
function ProductCard({ product, category, qty, canOrder, onAdd, onIncrement, onDecrement, onRemove, onOpen }) {
  const unavailable = !product.inStock;
  const minQty = lineMin(product);

  // When this item first lands in the cart, a small copy of its photo flies
  // to the cart bar. Driven by the cart itself (qty going from 0 to more), so
  // it only plays when the add really happened — not when the shop is closed
  // or a "replace your cart?" question is still open.
  const photo = useRef(null);
  const prevQty = useRef(qty);
  useEffect(() => {
    if (prevQty.current === 0 && qty > 0) flyToCart(photo.current);
    prevQty.current = qty;
  }, [qty]);

  return (
    <article className={`${s.card} ${unavailable ? s.unavailable : ''}`}>
      <div className={s.info}>
        <VegDot isVeg={product.isVeg} />
        <h3 className={s.name}>
          {onOpen ? (
            <button type="button" className={s.nameButton} onClick={() => onOpen(product)} aria-label={t('product.detailsAria', { name: product.name })}>
              {product.name}
            </button>
          ) : (
            product.name
          )}
        </h3>
        {/* One line only — nothing at all when the shop has written no description. */}
        {product.description && <p className={s.description}>{product.description}</p>}
        <div className={s.priceRow}>
          <PriceTag amount={product.price} />
          {/* Nothing at all for the ordinary item that sells one at a time. */}
          {minQty > 1 && (
            <span className={s.min} aria-label={t('product.minOrderAria', { count: minQty })}>
              {t('product.minOrder', { count: minQty })}
            </span>
          )}
        </div>
        {unavailable && <p className={s.oos}>{t('common.outOfStock')}</p>}
      </div>
      <div className={s.side} ref={photo}>
        {onOpen ? (
          <button type="button" className={s.photoButton} onClick={() => onOpen(product)} tabIndex={-1} aria-hidden="true">
            <SmartImage
              src={product.image}
              alt={t('common.imageAlt', { name: product.name })}
              ratio="4 / 3"
              fallback={<CategoryIcon category={category} size={28} />}
            />
          </button>
        ) : (
          <SmartImage
            src={product.image}
            alt={t('common.imageAlt', { name: product.name })}
            ratio="4 / 3"
            fallback={<CategoryIcon category={category} size={28} />}
          />
        )}
        {!unavailable &&
          (qty > 0 ? (
            <QuantityStepper
              className={s.control}
              value={qty}
              min={minQty}
              itemName={product.name}
              onIncrement={() => onIncrement(product.id)}
              onDecrement={() => onDecrement(product.id)}
              onRemove={onRemove && (() => onRemove(product.id))}
            />
          ) : (
            <Button
              variant="secondary"
              className={s.control}
              iconLeft={<PlusIcon size={18} strokeWidth={2.5} />}
              disabled={!canOrder}
              onClick={() => onAdd(product)}
              aria-label={t('shopPage.addAria', { name: product.name })}
            >
              {t('shopPage.add')}
            </Button>
          ))}
      </div>
    </article>
  );
}

export default memo(ProductCard);
