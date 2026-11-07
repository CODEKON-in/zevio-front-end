import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getShopById, setShopOpen } from '../../services/shopService.js';
import { Button, ErrorState, InfoNote, SkeletonList, SmartImage, Toggle } from '../../components/ui/index.js';
import ShopFormDrawer from '../../components/admin/ShopFormDrawer.jsx';
import { BagIcon, CategoryIcon, EditIcon, OrdersIcon } from '../../components/icons/Icons.jsx';
import { ADMIN_BASE } from '../../utils/constants.js';
import a from './admin.module.css';
import s from './AdminMyShop.module.css';

/**
 * A shop owner's home: their one shop — open/closed, menu, orders, details.
 * They never see other shops, customers, platform settings or Access; the
 * /api proxy refuses those calls from them anyway.
 */
export default function AdminMyShop() {
  const { admin } = useAdminAuth();
  const { showToast } = useToast();
  const shop = useAsync(() => getShopById(admin.shopId), [admin.shopId]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const toggle = async (isOpen) => {
    setBusy(true);
    try {
      const updated = await setShopOpen(admin.shopId, isOpen);
      shop.setData(updated);
    } catch (e) {
      showToast(t(`errors.${e.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (shop.loading) return <SkeletonList count={3} />;
  if (shop.error) return <ErrorState error={shop.error} onRetry={shop.reload} />;
  const x = shop.data;

  return (
    <>
      <div className={s.hero}>
        <SmartImage src={x.image} alt="" ratio="16 / 9" className={s.photo} fallback={<CategoryIcon category={x.category} size={40} />} />
        <div className={s.heroText}>
          <p className={a.muted}>{t('admin.myShop.title')}</p>
          <h1 className={a.title}>{x.name}</h1>
          <p className={a.muted}>{[t(`categories.${x.category}`), x.address].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      {!x.isActive && <InfoNote tone="warning">{t('admin.myShop.hidden')}</InfoNote>}

      <div className={`${a.block} ${s.open}`}>
        <Toggle
          label={t('admin.myShop.open')}
          description={t('admin.myShop.openHelp')}
          checked={x.isOpen}
          loading={busy}
          disabled={!x.isActive}
          onChange={toggle}
        />
      </div>

      <div className={s.cards}>
        <Link to={`${ADMIN_BASE}/shops/${x.id}/products`} className={s.card}>
          <BagIcon size={24} />
          <strong>{t('admin.myShop.menu')}</strong>
          <span className={a.muted}>{t('admin.myShop.menuHelp')}</span>
        </Link>
        <Link to={`${ADMIN_BASE}/orders`} className={s.card}>
          <OrdersIcon size={24} />
          <strong>{t('admin.myShop.orders')}</strong>
          <span className={a.muted}>{t('admin.myShop.ordersHelp')}</span>
        </Link>
        <button type="button" className={s.card} onClick={() => setEditing(true)}>
          <EditIcon size={24} />
          <strong>{t('admin.myShop.settings')}</strong>
          <span className={a.muted}>{t('admin.myShop.settingsHelp')}</span>
        </button>
      </div>

      <ShopFormDrawer open={editing} shop={x} ownerMode onClose={() => setEditing(false)} onSaved={(saved) => shop.setData(saved)} />
    </>
  );
}
