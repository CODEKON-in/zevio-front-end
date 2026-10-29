import EmptyState from './EmptyState.jsx';
import Button from './Button.jsx';
import { AlertIcon, RefreshIcon } from '../icons/Icons.jsx';
import { t } from '../../i18n/index.js';

/**
 * ErrorState — shown when loading fails, with a retry button.
 * Props:
 *  - error: Error (optional) — if it has a known `code`, the matching translated message is shown
 *  - message: string — overrides the message
 *  - onRetry: () => void — shows the "Try again" button when given
 */
export default function ErrorState({ error, message, onRetry }) {
  const known = error?.code ? t(`errors.${error.code}`) : null;
  const text = message || (known && known !== `errors.${error.code}` ? known : t('common.errorMessage'));

  return (
    <EmptyState
      tone="danger"
      role="alert"
      icon={<AlertIcon size={36} />}
      title={t('common.errorTitle')}
      message={text}
      action={
        onRetry && (
          <Button variant="outline" iconLeft={<RefreshIcon size={20} />} onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )
      }
    />
  );
}
