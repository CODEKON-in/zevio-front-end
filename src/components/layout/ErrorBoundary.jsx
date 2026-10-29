import { Component } from 'react';
import { t } from '../../i18n/index.js';
import Button from '../ui/Button.jsx';
import { AlertIcon, RefreshIcon } from '../icons/Icons.jsx';
import s from './ErrorBoundary.module.css';

/** True when a lazy section failed to download (slow/dropped network, or a new deploy removed old files). */
function isChunkError(error) {
  const msg = String(error?.message || error);
  return /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(msg);
}

/**
 * ErrorBoundary — catches crashes in the screens below it and shows a friendly
 * "Reload" screen instead of a blank page.
 * Props: children, resetKey (when it changes — e.g. the URL — the error is cleared)
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Hook for a crash reporter later (e.g. Firebase Crashlytics / Sentry).
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    return (
      <main className={s.page} role="alert">
        <div className={s.icon} aria-hidden="true">
          <AlertIcon size={40} />
        </div>
        <h1 className={s.title}>{t('crash.title')}</h1>
        <p className={s.message}>{chunk ? t('crash.updateMessage') : t('crash.message')}</p>
        <Button size="lg" block iconLeft={<RefreshIcon size={20} />} onClick={() => window.location.reload()}>
          {t('crash.reload')}
        </Button>
        <Button variant="ghost" block as="a" href="/">
          {t('crash.home')}
        </Button>
      </main>
    );
  }
}
