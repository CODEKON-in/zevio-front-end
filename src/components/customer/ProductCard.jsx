import { memo } from 'react';
import { t } from '../../i18n/index.js';
import Button from '../ui/Button.jsx';
import PriceTag from '../ui/PriceTag.jsx';
import QuantityStepper from '../ui/QuantityStepper.jsx';
import SmartImage from '../ui/SmartImage.jsx';
import VegDot from '../ui/VegDot.jsx';
import { CategoryIcon, PlusIcon } from '../icons/Icons.jsx';
import s from './ProductCard.module.css';

/**
 * ProductCard — one item in a shop menu.
 * Props:
 *  - product: object from productService
 *  - category: shop category (for the image fallback icon)
 *  - qty: number currently in cart
 *  - canOrder: boolean — false when the shop is closed
 *  - onAdd(product), onIncrement(productId), onDecrement(productId)
 */
function ProductCard({ product, category, qty, canOrder, onAdd, onIncrement, onDecrement }) {
  const unavailable = !product.inStock;

  return (
    <article className={`${s.card} ${unavailable ? s.unavailable : ''}`}>
      <div className={s.info}>
        <VegDot isVeg={product.isVeg} />
        <h3 className={s.name}>{product.name}</h3>
        <PriceTag amount={product.price} />
        {unavailable && <p className={s.oos}>{t('common.outOfStock')}</p>}
      </div>
      <div className={s.side}>
        <SmartImage
          src={product.image}
          alt={t('common.imageAlt', { name: product.name })}
          ratio="4 / 3"
          fallback={<CategoryIcon category={category} size={28} />}
        />
        {!unavailable &&
          (qty > 0 ? (
            <QuantityStepper
              className={s.control}
              value={qty}
              itemName={product.name}
              onIncrement={() => onIncrement(product.id)}
              onDecrement={() => onDecrement(product.id)}
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
