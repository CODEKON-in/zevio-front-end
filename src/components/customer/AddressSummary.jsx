import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import s from './AddressSummary.module.css';

/**
 * AddressSummary — readable address block.
 * Props: address, compact (boolean — one line, for chips)
 */
export default function AddressSummary({ address, compact = false }) {
  const { getPlace } = useSettings();
  if (!address) return null;
  const place = getPlace(address.placeId)?.name || '';

  if (compact) {
    return <span className={s.compact}>{[address.street, place].filter(Boolean).join(', ')}</span>;
  }

  return (
    <div className={s.block}>
      <p className={s.name}>
        {address.name} · {address.phone}
      </p>
      <p>{[address.street, place].filter(Boolean).join(', ')}</p>
      {address.landmark && <p className={s.muted}>{t('tracking.landmark', { landmark: address.landmark })}</p>}
      {address.notes && <p className={s.muted}>{address.notes}</p>}
    </div>
  );
}
