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
 *  - overlay: boolean — float over a hero image: transparent, with round
 *    buttons, until `solid` turns it into the normal bar (the shop page)
 *  - solid: boolean — with overlay, show the bar's background and title
 */
export default function PageHeader({ title, backTo = '/', showBack = true, right, overlay = false, solid = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    // 'default' key = first page in this tab, so there is nowhere to go back to.
    if (location.key !== 'default') navigate(-1);
    else navigate(backTo, { replace: true });
  };

  return (
    <header className={`${s.header} ${overlay ? s.overlay : ''} ${overlay && solid ? s.solid : ''}`}>
      {overlay && <span className={s.backdrop} aria-hidden="true" />}
      {showBack && (
        <button type="button" className={s.back} onClick={goBack} aria-label={t('common.back')}>
          <ChevronLeftIcon size={26} />
        </button>
      )}
      <h1 className={s.title} aria-hidden={overlay && !solid ? true : undefined}>
        {title}
      </h1>
      {right && <div className={s.right}>{right}</div>}
    </header>
  );
}
