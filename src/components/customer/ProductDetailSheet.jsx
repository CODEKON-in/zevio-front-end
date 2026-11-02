import { t } from '../../i18n/index.js';
import BottomSheet from '../ui/BottomSheet.jsx';
import Button from '../ui/Button.jsx';
import PriceTag from '../ui/PriceTag.jsx';
import QuantityStepper from '../ui/QuantityStepper.jsx';
import SmartImage from '../ui/SmartImage.jsx';
import VegDot from '../ui/VegDot.jsx';
import { CategoryIcon, PlusIcon } from '../icons/Icons.jsx';
import { lineMin } from '../../utils/productRules.js';
import s from './ProductDetailSheet.module.css';

/**
 * A closer look at one item: bigger photo and the full description.
 *
 * Opening this is never required — Add on the card still works on its own.
 * Props: product, category, qty, canOrder, onClose, onAdd, onIncrement, onDecrement, onRemove
 */
export default function ProductDetailSheet({ product, category, qty = 0, canOrder, onClose, onAdd, onIncrement, onDecrement, onRemove }) {
  if (!product) return null;
  const unavailable = !product.inStock;
  const minQty = lineMin(product);

  return (
    <BottomSheet open onClose={onClose} title={product.name}>
      <div className={s.body}>
        <div className={s.photo}>
          <SmartImage
            src={product.image}
            alt={t('common.imageAlt', { name: product.name })}
            ratio="16 / 9"
            fallback={<CategoryIcon category={category} size={44} />}
          />
        </div>

        <div className={s.head}>
          <VegDot isVeg={product.isVeg} />
          <PriceTag amount={product.price} size="lg" />
          {product.section && <span className={s.section}>{product.section}</span>}
        </div>

        {/* No empty heading when the shop has not written one yet. */}
        {product.description && <p className={s.description}>{product.description}</p>}

        {/* Said in full here, so Add holding 3 units is not a surprise. */}
        {minQty > 1 && <p className={s.minOrder}>{t('product.minOrderLine', { count: minQty })}</p>}

        {unavailable ? (
          <p className={s.oos}>{t('common.outOfStock')}</p>
        ) : qty > 0 ? (
          <QuantityStepper
            value={qty}
            min={minQty}
            itemName={product.name}
            onIncrement={() => onIncrement(product.id)}
            onDecrement={() => onDecrement(product.id)}
            onRemove={onRemove && (() => onRemove(product.id))}
          />
        ) : (
          <Button size="lg" block disabled={!canOrder} iconLeft={<PlusIcon size={18} strokeWidth={2.5} />} onClick={() => onAdd(product)}>
            {t('shopPage.add')}
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}
