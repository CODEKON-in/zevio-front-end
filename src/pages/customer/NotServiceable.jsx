import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Button } from '../../components/ui/index.js';
import { LocationIcon } from '../../components/icons/Icons.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import s from './NotServiceable.module.css';

/** Friendly screen when the user's place is outside the service area. */
export default function NotServiceable() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  return (
    <>
      <PageHeader title="" />
      <main className={s.page}>
        <div className={s.icon} aria-hidden="true">
          <LocationIcon size={44} />
        </div>
        <h1>{t('notServiceable.title')}</h1>
        <p className={s.message}>{t('notServiceable.message')}</p>
        <section className={s.places} aria-labelledby="places-title">
          <h2 id="places-title">{t('notServiceable.places')}</h2>
          <ul>
            {settings.servicePlaces.map((pl) => (
              <li key={pl.id}>{pl.name}</li>
            ))}
          </ul>
        </section>
        <Button size="lg" block onClick={() => navigate(-1)}>
          {t('notServiceable.back')}
        </Button>
      </main>
    </>
  );
}
