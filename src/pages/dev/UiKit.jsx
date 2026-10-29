import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getShopById, getShops } from '../../services/shopService.js';
import { getProductsByShop } from '../../services/productService.js';
import { failNextRequest } from '../../services/devService.js';
import {
  Badge, BottomSheet, Button, Card, EmptyState, ErrorState, Input, Modal, PriceTag,
  QuantityStepper, Select, Skeleton, SkeletonList, SmartImage, StatusTimeline, Toggle, VegDot, statusTone,
} from '../../components/ui/index.js';
import { CategoryIcon, CheckIcon, ClockIcon, LocationIcon, PlusIcon } from '../../components/icons/Icons.jsx';
import { ORDER_FLOW, ORDER_STATUS, PLACE_NOT_LISTED, SHOP_CATEGORIES } from '../../utils/constants.js';
import s from './UiKit.module.css';

/** DEV-only showcase of every reusable component (route: /dev/ui). */
export default function UiKit() {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const cart = useCart();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(true);
  const [online, setOnline] = useState(false);
  const [place, setPlace] = useState('');
  const [landmark, setLandmark] = useState('');
  const [statusIdx, setStatusIdx] = useState(1);
  const [rejected, setRejected] = useState(false);

  const shops = useAsync(() => getShops(), []);
  const sample = useAsync(async () => {
    const [shop, products] = await Promise.all([getShopById('s1'), getProductsByShop('s1')]);
    return { shop, products };
  }, []);
  const [pending, setPending] = useState(null); // product waiting for "clear cart?" answer

  const addToCart = (product) => {
    if (cart.addItem(product, sample.data.shop) === 'conflict') {
      setPending(product);
      setSheetOpen(true);
    }
  };
  const confirmReplace = () => {
    if (pending) cart.replaceWith(pending, sample.data.shop);
    setPending(null);
    setSheetOpen(false);
  };
  const closeSheet = () => {
    setPending(null);
    setSheetOpen(false);
  };

  // Demo timeline history: one entry per reached step, 5 minutes apart.
  const timelineStatus = rejected ? ORDER_STATUS.CANCELLED : ORDER_FLOW[statusIdx];
  const base = Date.now() - 40 * 60000;
  const history = rejected
    ? [{ status: 'PENDING', at: new Date(base).toISOString() }, { status: 'CANCELLED', at: new Date(base + 120000).toISOString() }]
    : ORDER_FLOW.slice(0, statusIdx + 1).map((st, i) => ({ status: st, at: new Date(base + i * 5 * 60000).toISOString() }));

  const placeOptions = [
    ...settings.servicePlaces.map((p) => ({ value: p.id, label: p.name })),
    { value: PLACE_NOT_LISTED, label: t('uikit.notListed') },
  ];

  return (
    <main className={`container ${s.page}`}>
      <header className={s.header}>
        <h1>{t('uikit.title')}</h1>
        <p className={s.muted}>{t('uikit.intro')}</p>
      </header>

      <Section title={t('uikit.buttons')}>
        <div className={s.wrap}>
          <Button>{t('uikit.primary')}</Button>
          <Button variant="secondary">{t('uikit.secondary')}</Button>
          <Button variant="outline">{t('uikit.outline')}</Button>
          <Button variant="ghost">{t('uikit.ghost')}</Button>
          <Button variant="danger">{t('uikit.danger')}</Button>
          <Button variant="success" iconLeft={<CheckIcon size={20} />}>{t('uikit.success')}</Button>
          <Button loading>{t('uikit.loadingBtn')}</Button>
          <Button disabled>{t('uikit.disabled')}</Button>
          <Button size="sm" variant="outline">{t('uikit.small')}</Button>
        </div>
        <Button size="lg" block>{t('uikit.large')}</Button>
      </Section>

      <Section title={t('uikit.forms')}>
        <Input label={t('uikit.nameLabel')} placeholder={t('uikit.namePlaceholder')} required autoComplete="name" />
        <Input label={t('uikit.phoneLabel')} hint={t('uikit.phoneHint')} prefix="+91" type="tel" inputMode="numeric" maxLength={10} required />
        <Select
          label={t('uikit.placeLabel')}
          placeholder={t('uikit.placePlaceholder')}
          options={placeOptions}
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          required
        />
        <Input
          label={t('uikit.landmarkLabel')}
          required
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          error={landmark.trim() ? undefined : t('uikit.landmarkError')}
        />
        <Input label={`${t('uikit.notesLabel')} (${t('common.optional')})`} multiline />
      </Section>

      <Section title={t('uikit.badges')}>
        <div className={s.wrap}>
          <Badge tone="success" solid>{t('common.open')}</Badge>
          <Badge tone="neutral" solid>{t('common.closed')}</Badge>
          {[...ORDER_FLOW, ORDER_STATUS.CANCELLED].map((st) => (
            <Badge key={st} tone={statusTone(st)}>{t(`orderStatus.${st}`)}</Badge>
          ))}
          <Badge tone="warning" size="sm">{t('subscription.TRIAL')}</Badge>
          <Badge tone="danger" size="sm">{t('subscription.EXPIRED')}</Badge>
        </div>
        <div className={s.wrap}>
          {SHOP_CATEGORIES.map((c) => (
            <Badge key={c} tone="primary" icon={<CategoryIcon category={c} size={16} />}>{t(`categories.${c}`)}</Badge>
          ))}
        </div>
      </Section>

      <Section title={t('uikit.prices')}>
        <div className={s.wrap}>
          <PriceTag amount={20} size="sm" />
          <PriceTag amount={1250} />
          <PriceTag amount={125000} size="lg" />
          <PriceTag amount={349.5} original={420} size="xl" />
        </div>
      </Section>

      <Section title={t('uikit.product')}>
        {sample.loading && <SkeletonList count={2} />}
        {!sample.loading && sample.error && <ErrorState error={sample.error} onRetry={sample.reload} />}
        {!sample.loading && sample.data && (
          <div className={s.stack}>
            <h3>{sample.data.shop.name}</h3>
            {sample.data.products.slice(0, 6).map((p) => {
              const qty = cart.getQty(p.id);
              return (
                <Card key={p.id} padding="sm" className={s.product}>
                  <SmartImage src={p.image} alt={t('common.imageAlt', { name: p.name })} ratio="1 / 1" className={s.productImg} fallback={<CategoryIcon category="hotels" size={28} />} />
                  <div className={s.productInfo}>
                    <div className={s.row}>
                      <VegDot isVeg={p.isVeg} />
                      <h3 className={s.productName}>{p.name}</h3>
                    </div>
                    <PriceTag amount={p.price} />
                  </div>
                  <div className={s.productAction}>
                    {!p.inStock ? (
                      <Badge tone="neutral">{t('common.outOfStock')}</Badge>
                    ) : qty > 0 ? (
                      <QuantityStepper value={qty} itemName={p.name} onIncrement={() => cart.increment(p.id)} onDecrement={() => cart.decrement(p.id)} />
                    ) : (
                      <Button variant="secondary" iconLeft={<PlusIcon size={18} />} onClick={() => addToCart(p)}>
                        {t('common.add')}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
            {cart.itemCount > 0 && (
              <p className={s.muted}>
                {t('common.itemsCount', { count: cart.itemCount })} · <PriceTag amount={cart.itemTotal} size="sm" />
              </p>
            )}
          </div>
        )}
      </Section>

      <Section title={t('uikit.toggles')}>
        <Toggle size="lg" label={t('uikit.shopOpen')} checked={shopOpen} onChange={setShopOpen} onText={t('common.open')} offText={t('common.closed')} />
        <Toggle label={t('uikit.online')} checked={online} onChange={setOnline} />
      </Section>

      <Section title={t('uikit.overlays')}>
        <div className={s.wrap}>
          <Button variant="outline" onClick={() => setSheetOpen(true)}>{t('uikit.openSheet')}</Button>
          <Button variant="outline" onClick={() => setModalOpen(true)}>{t('uikit.openModal')}</Button>
        </div>
        <BottomSheet
          open={sheetOpen}
          onClose={closeSheet}
          title={t('uikit.sheetTitle')}
          footer={
            <>
              <Button variant="outline" onClick={closeSheet}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={confirmReplace}>{t('common.confirm')}</Button>
            </>
          }
        >
          <p>{t('uikit.sheetBody')}</p>
        </BottomSheet>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={t('uikit.modalTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
              <Button variant="success" onClick={() => setModalOpen(false)}>{t('common.confirm')}</Button>
            </>
          }
        >
          <p>{t('uikit.modalBody')}</p>
        </Modal>
      </Section>

      <Section title={t('uikit.toasts')}>
        <div className={s.wrap}>
          <Button variant="outline" onClick={() => showToast(t('uikit.toastInfoMsg'))}>{t('uikit.toastInfo')}</Button>
          <Button variant="outline" onClick={() => showToast(t('uikit.toastSuccessMsg'), { type: 'success' })}>{t('uikit.toastSuccess')}</Button>
          <Button variant="outline" onClick={() => showToast(t('uikit.toastErrorMsg'), { type: 'error' })}>{t('uikit.toastError')}</Button>
        </div>
      </Section>

      <Section title={t('uikit.timeline')}>
        <Card>
          <StatusTimeline status={timelineStatus} history={history} extra={rejected ? t('rejectReasons.shopBusy') : null} />
        </Card>
        <div className={s.wrap}>
          <Button variant="outline" onClick={() => { setRejected(false); setStatusIdx((i) => (i + 1) % ORDER_FLOW.length); }}>
            {t('uikit.nextStatus')}
          </Button>
          <Button variant="ghost" onClick={() => setRejected((r) => !r)}>{t('uikit.rejectDemo')}</Button>
        </div>
      </Section>

      <Section title={t('uikit.skeletons')}>
        <div className={s.row}>
          <Skeleton circle height={48} />
          <div className={s.stack} style={{ flex: 1 }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" />
          </div>
        </div>
        <SkeletonList count={1} variant="card" />
      </Section>

      <Section title={t('uikit.states')}>
        <Card padding="none">
          <EmptyState message={t('uikit.emptyMsg')} />
        </Card>
        <Card padding="none">
          <ErrorState onRetry={() => showToast(t('common.retry'))} />
        </Card>
      </Section>

      <Section title={t('uikit.servicesDemo')}>
        <p className={s.muted}>{t('uikit.servicesIntro')}</p>
        <div className={s.wrap}>
          <Button variant="outline" onClick={shops.reload}>{t('uikit.reload')}</Button>
          <Button variant="ghost" onClick={() => { failNextRequest(); shops.reload(); }}>{t('uikit.simulateError')}</Button>
        </div>
        {shops.loading && <SkeletonList count={3} variant="card" />}
        {!shops.loading && shops.error && <ErrorState error={shops.error} onRetry={shops.reload} />}
        {!shops.loading && !shops.error && shops.data && (
          <>
            <p className={s.muted}>{t('uikit.shopsFound', { count: shops.data.length })}</p>
            <ul className={s.shopGrid}>
              {shops.data.map((shop) => (
                <Card as="li" key={shop.id} padding="none" muted={!shop.isOpen}>
                  <SmartImage src={shop.image} alt={t('common.imageAlt', { name: shop.name })} ratio="16 / 9" rounded={false} fallback={<CategoryIcon category={shop.category} size={40} />} />
                  <div className={s.shopBody}>
                    <div className={s.between}>
                      <h3>{shop.name}</h3>
                      <Badge tone={shop.isOpen ? 'success' : 'neutral'} solid size="sm">{shop.isOpen ? t('common.open') : t('common.closed')}</Badge>
                    </div>
                    <p className={s.meta}>
                      <span>{t(`categories.${shop.category}`)}</span>
                      <span className={s.metaItem}><LocationIcon size={16} />{settings.servicePlaces.find((pl) => pl.id === shop.placeId)?.name}</span>
                      <span className={s.metaItem}><ClockIcon size={16} />{t('common.minutes', { time: shop.deliveryTime })}</span>
                    </p>
                  </div>
                </Card>
              ))}
            </ul>
          </>
        )}
      </Section>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>{title}</h2>
      <div className={s.stack}>{children}</div>
    </section>
  );
}
