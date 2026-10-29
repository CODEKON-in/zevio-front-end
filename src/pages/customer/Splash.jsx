import { t } from '../../i18n/index.js';
import Spinner from '../../components/ui/Spinner.jsx';
import { StoreIcon } from '../../components/icons/Icons.jsx';
import s from './Splash.module.css';

/** Shown on first load while settings are fetched. */
export default function Splash() {
  return (
    <div className={s.splash}>
      <span className={s.logo} aria-hidden="true">
        <StoreIcon size={44} />
      </span>
      <p className={s.name}>{t('app.name')}</p>
      <p className={s.tagline}>{t('app.tagline')}</p>
      <Spinner size={28} label={t('splash.loading')} />
    </div>
  );
}
