import { t } from '../../i18n/index.js';
import { MinusIcon, PlusIcon } from '../icons/Icons.jsx';
import { MAX_ITEM_QTY } from '../../utils/constants.js';
import { cx } from '../../utils/format.js';
import s from './QuantityStepper.module.css';

/**
 * QuantityStepper — [ − ] 2 [ + ]
 * Props:
 *  - value: number
 *  - onIncrement: () => void
 *  - onDecrement: () => void — at value 1 this usually removes the item (cart decides)
 *  - min: number (default 0) — minus disabled at this value
 *  - max: number (default MAX_ITEM_QTY)
 *  - itemName: string — used in screen-reader labels ("Add one more Idli")
 *  - size: 'md' | 'lg' (default 'md')
 */
export default function QuantityStepper({ value, onIncrement, onDecrement, min = 0, max = MAX_ITEM_QTY, itemName = '', size = 'md', className }) {
  return (
    <div className={cx(s.stepper, s[size], className)} role="group" aria-label={t('stepper.quantity', { name: itemName, count: value })}>
      <button
        type="button"
        className={s.btn}
        onClick={onDecrement}
        disabled={value <= min}
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
  );
}
