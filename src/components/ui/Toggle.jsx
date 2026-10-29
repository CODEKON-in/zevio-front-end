import { useId } from 'react';
import { t } from '../../i18n/index.js';
import { cx } from '../../utils/format.js';
import s from './Toggle.module.css';

/**
 * Toggle — on/off switch (role="switch").
 * Props:
 *  - checked: boolean
 *  - onChange: (nextChecked: boolean) => void
 *  - label: string (required, visible)
 *  - description: string — smaller text under the label
 *  - onText / offText: state text shown next to the switch (default "On"/"Off")
 *  - size: 'md' | 'lg' — 'lg' is the big shop Open/Closed and partner Online/Offline switch
 *  - disabled, loading: boolean
 *  - ariaLabel: string — accessible name when the visible label is not unique (e.g. "Idli: In stock" in a list)
 */
export default function Toggle({ checked, onChange, label, description, onText, offText, size = 'md', disabled = false, loading = false, ariaLabel, className }) {
  const labelId = useId();
  const descId = useId();
  const stateText = checked ? onText || t('toggle.on') : offText || t('toggle.off');

  return (
    <div className={cx(s.row, s[size], checked && s.on, className)}>
      <div className={s.text}>
        <span id={labelId} className={s.label}>{label}</span>
        {description && <span id={descId} className={s.description}>{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={ariaLabel ? undefined : labelId}
        aria-label={ariaLabel}
        aria-describedby={description ? descId : undefined}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        className={s.switch}
        onClick={() => onChange(!checked)}
      >
        <span className={s.stateText} aria-hidden="true">{stateText}</span>
        <span className={s.track} aria-hidden="true">
          <span className={s.thumb} />
        </span>
      </button>
    </div>
  );
}
