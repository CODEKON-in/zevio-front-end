import { t } from '../../i18n/index.js';
import Spinner from '../../components/ui/Spinner.jsx';
import MyntLogo from '../../components/brand/MyntLogo.jsx';
import s from './Splash.module.css';

/**
 * Shown only if settings are still loading after the HTML intro has finished
 * (a slow connection). It is the intro's final frame — the Mynt lockup on
 * cream — plus a spinner, so the hand-over is seamless.
 */
export default function Splash() {
  return (
    <div className={s.splash}>
      <MyntLogo size={56} className={s.logo} />
      <p className={s.tagline}>{t('app.tagline')}</p>
      <Spinner size={28} label={t('splash.loading')} />
    </div>
  );
}
