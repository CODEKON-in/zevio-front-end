import { forwardRef, useId } from 'react';
import { cx } from '../../utils/format.js';
import s from './Field.module.css';

/**
 * Input — labelled text field (or textarea with `multiline`).
 * Props:
 *  - label: string (required — every input must have a visible label)
 *  - hint: string — helper text under the field
 *  - error: string — shows red text and marks the field invalid
 *  - required: boolean — adds a red * and the native required attribute
 *  - multiline: boolean, rows: number — render a <textarea>
 *  - prefix: string — fixed text inside the left edge (e.g. "+91")
 *  - id, className, and all native input props (value, onChange, type, inputMode, …)
 */
const Input = forwardRef(function Input(
  { label, hint, error, required, multiline = false, rows = 3, prefix, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={inputId} className={s.label}>
        {label}
        {required && <span className={s.req} aria-hidden="true"> *</span>}
      </label>
      <div className={s.control}>
        {prefix && <span className={s.prefix}>{prefix}</span>}
        <Field
          ref={ref}
          id={inputId}
          className={cx(s.input, error && s.invalid, prefix && s.hasPrefix)}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          required={required}
          rows={multiline ? rows : undefined}
          {...rest}
        />
      </div>
      {hint && !error && <p id={hintId} className={s.hint}>{hint}</p>}
      {error && <p id={errorId} className={s.error}>{error}</p>}
    </div>
  );
});

export default Input;
