import { useLocation, useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { ChevronLeftIcon } from '../icons/Icons.jsx';
import s from './PageHeader.module.css';

/**
 * PageHeader — sticky top bar with a back button and title.
 * Props:
 *  - title: string
 *  - backTo: string — where Back goes if there is no history (default '/')
 *  - showBack: boolean (default true)
 *  - right: ReactNode — action on the right (e.g. a call button)
 */
export default function PageHeader({ title, backTo = '/', showBack = true, right }) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    // 'default' key = first page in this tab, so there is nowhere to go back to.
    if (location.key !== 'default') navigate(-1);
    else navigate(backTo, { replace: true });
  };

  return (
    <header className={s.header}>
      {showBack && (
        <button type="button" className={s.back} onClick={goBack} aria-label={t('common.back')}>
          <ChevronLeftIcon size={26} />
        </button>
      )}
      <h1 className={s.title}>{title}</h1>
      {right && <div className={s.right}>{right}</div>}
    </header>
  );
}
