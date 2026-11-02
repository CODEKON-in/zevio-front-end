import { t } from '../../i18n/index.js';
import BottomSheet from '../ui/BottomSheet.jsx';
import Button from '../ui/Button.jsx';
import PriceTag from '../ui/PriceTag.jsx';
import QuantityStepper from '../ui/QuantityStepper.jsx';
import SmartImage from '../ui/SmartImage.jsx';
import VegDot from '../ui/VegDot.jsx';
import { CategoryIcon, PlusIcon } from '../icons/Icons.jsx';
import s from './ProductDetailSheet.module.css';

/**
 * A closer look at one item: bigger photo and the full description.
 *
 * Opening this is never required — Add on the card still works on its own.
 * Props: product, category, qty, canOrder, onClose, onAdd, onIncrement, onDecrement
 */
export default function ProductDetailSheet({ product, category, qty = 0, canOrder, onClose, onAdd, onIncrement, onDecrement }) {
  if (!product) return null;
  const unavailable = !product.inStock;

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

        {unavailable ? (
          <p className={s.oos}>{t('common.outOfStock')}</p>
        ) : qty > 0 ? (
          <QuantityStepper
            value={qty}
            itemName={product.name}
            onIncrement={() => onIncrement(product.id)}
            onDecrement={() => onDecrement(product.id)}
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
