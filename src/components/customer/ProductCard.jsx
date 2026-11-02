import { memo } from 'react';
import { t } from '../../i18n/index.js';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import PriceTag from '../ui/PriceTag.jsx';
import QuantityStepper from '../ui/QuantityStepper.jsx';
import SmartImage from '../ui/SmartImage.jsx';
import VegDot from '../ui/VegDot.jsx';
import { CategoryIcon, PlusIcon } from '../icons/Icons.jsx';
import { lineMin } from '../../utils/productRules.js';
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
            <Badge tone="info" size="sm" aria-label={t('product.minOrderAria', { count: minQty })}>
              {t('product.minOrder', { count: minQty })}
            </Badge>
          )}
        </div>
        {unavailable && <p className={s.oos}>{t('common.outOfStock')}</p>}
      </div>
      <div className={s.side}>
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
