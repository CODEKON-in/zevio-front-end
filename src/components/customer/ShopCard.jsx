import { memo } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import SmartImage from '../ui/SmartImage.jsx';
import { CategoryIcon, ClockIcon, LocationIcon } from '../icons/Icons.jsx';
import { formatClock } from '../../utils/format.js';
import s from './ShopCard.module.css';

/**
 * ShopCard — tappable shop row linking to /shop/:id. Closed shops are greyed.
 * Props: shop (object from shopService)
 */
function ShopCard({ shop }) {
  const { getPlace } = useSettings();
  const place = getPlace(shop.placeId);

  return (
    <Card as={Link} to={`/shop/${shop.id}`} interactive padding="sm" muted={!shop.isOpen} className={s.card}>
      <SmartImage
        src={shop.image}
        alt={t('common.imageAlt', { name: shop.name })}
        ratio="1 / 1"
        className={s.image}
        fallback={<CategoryIcon category={shop.category} size={34} />}
      />
      <div className={s.info}>
        <div className={s.top}>
          <h3 className={s.name}>{shop.name}</h3>
          <Badge tone={shop.isOpen ? 'success' : 'neutral'} solid size="sm">
            {shop.isOpen ? t('common.open') : t('common.closed')}
          </Badge>
        </div>
        <p className={s.meta}>
          {t(`categories.${shop.category}`)}
          {place && (
            <span className={s.metaItem}>
              <LocationIcon size={15} />
              {place.name}
            </span>
          )}
        </p>
        <p className={s.meta}>
          {shop.isOpen ? (
            <span className={s.metaItem}>
              <ClockIcon size={15} />
              {t('common.minutes', { time: shop.deliveryTime })}
            </span>
          ) : (
            <span className={s.metaItem}>
              <ClockIcon size={15} />
              {t('shopCard.opensAt', { time: formatClock(shop.timings?.open) })}
            </span>
          )}
        </p>
      </div>
    </Card>
  );
}

export default memo(ShopCard);
