import { memo } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import SmartImage from '../ui/SmartImage.jsx';
import { CategoryIcon, ClockIcon } from '../icons/Icons.jsx';
import { formatClock } from '../../utils/format.js';
import s from './ShopCard.module.css';

/**
 * ShopCard — tappable shop card linking to /shop/:id: a large photo, the name,
 * and one quiet line of facts (category · place · time). Closed shops are
 * desaturated and say when they open.
 * Props: shop (object from shopService)
 */
function ShopCard({ shop }) {
  const { getPlace } = useSettings();
  const place = getPlace(shop.placeId);
  const facts = [t(`categories.${shop.category}`), place?.name].filter(Boolean);

  return (
    <Card as={Link} to={`/shop/${shop.id}`} interactive padding="none" muted={!shop.isOpen} className={s.card}>
      <div className={s.media}>
        <SmartImage
          src={shop.image}
          alt={t('common.imageAlt', { name: shop.name })}
          ratio="16 / 9"
          rounded={false}
          className={s.image}
          fallback={<CategoryIcon category={shop.category} size={40} />}
        />
        <Badge tone={shop.isOpen ? 'success' : 'neutral'} solid size="sm" className={s.status}>
          {shop.isOpen ? t('common.open') : t('common.closed')}
        </Badge>
      </div>
      <div className={s.info}>
        <h3 className={s.name}>{shop.name}</h3>
        <p className={s.meta}>
          <span>{facts.join(' · ')}</span>
          <span className={s.time}>
            <ClockIcon size={15} />
            {shop.isOpen
              ? t('common.minutes', { time: shop.deliveryTime })
              : t('shopCard.opensAt', { time: formatClock(shop.timings?.open) })}
          </span>
        </p>
      </div>
    </Card>
  );
}

export default memo(ShopCard);
