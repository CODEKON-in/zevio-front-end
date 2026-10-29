import { t } from '../../i18n/index.js';
import { AlertIcon } from '../icons/Icons.jsx';
import { SUBSCRIPTION_STATUS } from '../../utils/constants.js';
import { daysUntil, formatDate } from '../../utils/format.js';
import s from './SubscriptionBanner.module.css';

const WARN_DAYS = 7;

/**
 * SubscriptionBanner — red warning when the subscription has expired,
 * amber reminder when it ends within 7 days. Renders nothing otherwise.
 * Props: subscription { plan, status, startDate, endDate }
 */
export default function SubscriptionBanner({ subscription }) {
  if (!subscription) return null;
  const days = daysUntil(subscription.endDate);
  const expired = subscription.status === SUBSCRIPTION_STATUS.EXPIRED || days < 0;

  if (expired) {
    return (
      <div className={`${s.banner} ${s.expired}`} role="alert">
        <AlertIcon size={22} />
        <p>{t('shopPanel.subscription.expiredBanner', { date: formatDate(subscription.endDate) })}</p>
      </div>
    );
  }
  if (days <= WARN_DAYS) {
    return (
      <div className={`${s.banner} ${s.warning}`} role="status">
        <AlertIcon size={22} />
        <p>{t('shopPanel.subscription.expiringBanner', { date: formatDate(subscription.endDate), days })}</p>
      </div>
    );
  }
  return null;
}
