import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAsync } from '../../hooks/useAsync.js';
import { getOrderById } from '../../services/orderService.js';
import { Button, ErrorState, Spinner } from '../../components/ui/index.js';
import { CheckIcon } from '../../components/icons/Icons.jsx';
import s from './OrderSuccess.module.css';

const REDIRECT_MS = 4000;

/** "Order placed!" screen, then automatically opens order tracking. */
export default function OrderSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = useAsync(() => getOrderById(id), [id]);

  useEffect(() => {
    if (!order.data) return undefined;
    const timer = setTimeout(() => navigate(`/orders/${id}`, { replace: true }), REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [order.data, id, navigate]);

  if (order.error) return <ErrorState error={order.error} onRetry={order.reload} />;

  return (
    <main className={s.page}>
      <div className={s.tick} aria-hidden="true">
        <CheckIcon size={56} strokeWidth={3} />
      </div>
      <h1 className={s.title}>{t('success.title')}</h1>
      {order.data ? (
        <>
          <p className={s.message}>{t('success.message', { number: order.data.number, shop: order.data.shopName })}</p>
          <div className={s.actions}>
            <Button as={Link} to={`/orders/${id}`} replace size="lg" block>
              {t('success.track')}
            </Button>
            <Button as={Link} to="/" replace variant="ghost" block>
              {t('success.home')}
            </Button>
          </div>
          <p className={s.redirect} role="status">
            <Spinner size={16} />
            {t('success.redirect')}
          </p>
        </>
      ) : (
        <Spinner size={28} label={t('common.loading')} />
      )}
    </main>
  );
}
