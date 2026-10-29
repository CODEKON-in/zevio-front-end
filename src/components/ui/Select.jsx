import { forwardRef, useId } from 'react';
import { ChevronDownIcon } from '../icons/Icons.jsx';
import { cx } from '../../utils/format.js';
import s from './Field.module.css';

/**
 * Select — labelled native dropdown (native is fastest and most familiar on cheap phones).
 * Props:
 *  - label: string (required)
 *  - options: Array<{ value: string, label: string, disabled?: boolean }>
 *  - placeholder: string — first, empty, disabled option
 *  - hint, error, required — same as Input
 *  - value, onChange, and other native select props
 */
const Select = forwardRef(function Select(
  { label, options = [], placeholder, hint, error, required, id, className, value, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id || autoId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={selectId} className={s.label}>
        {label}
        {required && <span className={s.req} aria-hidden="true"> *</span>}
      </label>
      <div className={s.control}>
        <select
          ref={ref}
          id={selectId}
          className={cx(s.input, s.select, error && s.invalid)}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          required={required}
          value={value ?? ''}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon size={20} className={s.chevron} />
      </div>
      {hint && !error && <p id={hintId} className={s.hint}>{hint}</p>}
      {error && <p id={errorId} className={s.error}>{error}</p>}
    </div>
  );
});

export default Select;
