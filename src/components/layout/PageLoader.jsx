import Spinner from '../ui/Spinner.jsx';
import { t } from '../../i18n/index.js';

/** Full-page spinner used as the Suspense fallback for lazy-loaded sections. */
export default function PageLoader() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', color: 'var(--color-primary)' }}>
      <Spinner size={36} label={t('common.loading')} />
    </div>
  );
}
