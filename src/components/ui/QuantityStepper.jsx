import { t } from '../../i18n/index.js';
import { MinusIcon, PlusIcon, TrashIcon } from '../icons/Icons.jsx';
import { MAX_ITEM_QTY } from '../../utils/constants.js';
import { cx } from '../../utils/format.js';
import s from './QuantityStepper.module.css';

/**
 * QuantityStepper — [ − ] 2 [ + ]  (and a 🗑 once it cannot go lower)
 *
 * Props:
 *  - value: number
 *  - onIncrement: () => void
 *  - onDecrement: () => void
 *  - min: number (default 1) — a product's minimum order quantity; − stops here
 *  - max: number (default MAX_ITEM_QTY)
 *  - onRemove: () => void — takes the item out altogether. Shown as a separate
 *    button as soon as − is spent, so "one less" and "none at all" never share
 *    a tap: a product with a minimum of 3 would otherwise be impossible to drop.
 *  - itemName: string — used in screen-reader labels ("Add one more Idli")
 *  - size: 'md' | 'lg' (default 'md')
 */
export default function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  onRemove,
  min = 1,
  max = MAX_ITEM_QTY,
  itemName = '',
  size = 'md',
  className,
}) {
  const atMin = value <= min;

  return (
    <div className={cx(s.wrap, className)}>
      <div className={cx(s.stepper, s[size])} role="group" aria-label={t('stepper.quantity', { name: itemName, count: value })}>
        <button
          type="button"
          className={s.btn}
          onClick={onDecrement}
          disabled={atMin}
          aria-label={t('stepper.decrease', { name: itemName })}
        >
          <MinusIcon size={20} strokeWidth={2.5} />
        </button>
        <span className={s.value} aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className={s.btn}
          onClick={onIncrement}
          disabled={value >= max}
          aria-label={t('stepper.increase', { name: itemName })}
        >
          <PlusIcon size={20} strokeWidth={2.5} />
        </button>
      </div>
      {onRemove && atMin && (
        <button
          type="button"
          className={cx(s.remove, s[size])}
          onClick={onRemove}
          aria-label={t('stepper.remove', { name: itemName })}
          title={t('stepper.removeShort')}
        >
          <TrashIcon size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
