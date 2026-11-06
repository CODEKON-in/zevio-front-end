import { t } from '../../i18n/index.js';
import Spinner from '../../components/ui/Spinner.jsx';
import MangoMark from '../../components/brand/MangoMark.jsx';
import s from './Splash.module.css';

/**
 * Shown on first load while settings are fetched. It looks exactly like the
 * HTML splash in index.html, so the hand-over between the two is invisible.
 */
export default function Splash() {
  return (
    <div className={s.splash}>
      <MangoMark size={84} />
      <span className={s.shadow} aria-hidden="true" />
      <p className={s.name}>{t('app.name')}</p>
      <p className={s.tagline}>{t('app.tagline')}</p>
      <Spinner size={28} label={t('splash.loading')} />
    </div>
  );
}
