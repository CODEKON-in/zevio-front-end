import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { t } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useShopPanel } from '../../context/ShopPanelContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { deleteProduct, getProductsByShop, saveProduct } from '../../services/productService.js';
import { Button, Card, ConfirmDialog, ErrorState, Input, Select, SkeletonList, SmartImage, Toggle } from '../../components/ui/index.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { CategoryIcon, ImageIcon, TrashIcon } from '../../components/icons/Icons.jsx';
import p from '../../styles/page.module.css';
import s from './ProductForm.module.css';

const toFoodType = (isVeg) => (isVeg === false ? 'nonVeg' : 'veg');
const fromFoodType = (v) => v !== 'nonVeg';

/** Add / edit a product. Route: /shop-panel/products/new or /shop-panel/products/:id */
export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shop } = useShopPanel();
  const { showToast } = useToast();

  // All of this shop's products: gives the existing categories, and the product being edited.
  const data = useAsync(() => getProductsByShop(user.shopId), [user.shopId]);
  const product = id ? data.data?.find((x) => x.id === id) : null;
  const sections = [...new Set((data.data || []).map((x) => x.section))];

  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState(null); // object URL of a chosen photo (preview only)
  const fileRef = useRef(null);

  // Fill the form once data has loaded.
  useEffect(() => {
    if (values || !data.data) return;
    setValues({
      name: product?.name ?? '',
      price: product ? String(product.price) : '',
      section: product?.section ?? '',
      foodType: product ? toFoodType(product.isVeg) : 'veg',
      inStock: product?.inStock ?? true,
    });
  }, [data.data, product, shop, values]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    const price = Number(values.price);
    if (!values.name.trim()) er.name = t('shopPanel.productForm.nameError');
    if (!(price > 0)) er.price = t('shopPanel.productForm.priceError');
    if (!values.section.trim()) er.section = t('shopPanel.productForm.sectionError');
    setErrors(er);
    if (Object.keys(er).length) {
      e.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    try {
      await saveProduct({
        ...(isNew ? {} : { id }),
        shopId: user.shopId,
        name: values.name.trim(),
        price: Math.round(price * 100) / 100,
        section: values.section.trim(),
        isVeg: fromFoodType(values.foodType),
        inStock: values.inStock,
      });
      showToast(t('shopPanel.productForm.saved'), { type: 'success' });
      navigate('/shop-panel/products', { replace: true });
    } catch (err) {
      setSaving(false);
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
    }
  };

  const doDelete = async () => {
    try {
      await deleteProduct(id);
      showToast(t('shopPanel.productForm.deleted'), { type: 'success' });
      navigate('/shop-panel/products', { replace: true });
    } catch (err) {
      setConfirmDelete(false);
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
    }
  };

  const title = isNew ? t('shopPanel.productForm.newTitle') : t('shopPanel.productForm.editTitle');

  return (
    <>
      <PageHeader title={title} backTo="/shop-panel/products" />
      <main className={`${p.page} ${p.pageNoNav}`}>
        {data.loading && !data.data ? (
          <SkeletonList count={3} />
        ) : data.error && !data.data ? (
          <ErrorState error={data.error} onRetry={data.reload} />
        ) : !isNew && !product ? (
          <ErrorState error={{ code: 'NOT_FOUND' }} />
        ) : values ? (
          <form id="product-form" className={s.form} onSubmit={submit} noValidate>
            <Card className={s.photoCard}>
              <div className={s.photo}>
                <SmartImage src={preview || product?.image} alt="" ratio="1 / 1" fallback={<CategoryIcon category={shop?.category} size={36} />} />
              </div>
              <div className={s.photoText}>
                <span className={s.photoLabel}>{t('shopPanel.productForm.imageLabel')}</span>
                <span className={p.muted}>{t('shopPanel.productForm.imageHint')}</span>
                <div className={p.row}>
                  <Button variant="outline" size="sm" iconLeft={<ImageIcon size={18} />} onClick={() => fileRef.current?.click()}>
                    {t('shopPanel.productForm.chooseImage')}
                  </Button>
                  {preview && (
                    <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                      {t('shopPanel.productForm.removeImage')}
                    </Button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" tabIndex={-1} aria-hidden="true" onChange={pickImage} />
              </div>
            </Card>

            <Input
              label={t('shopPanel.productForm.nameLabel')}
              placeholder={t('shopPanel.productForm.namePlaceholder')}
              required
              value={values.name}
              onChange={set('name')}
              error={errors.name}
            />
            <Input
              label={t('shopPanel.productForm.priceLabel')}
              required
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={values.price}
              onChange={set('price')}
              error={errors.price}
            />
            <Input
              label={t('shopPanel.productForm.sectionLabel')}
              hint={t('shopPanel.productForm.sectionHint')}
              required
              list="section-options"
              value={values.section}
              onChange={set('section')}
              error={errors.section}
            />
            <datalist id="section-options">
              {sections.map((sec) => (
                <option key={sec} value={sec} />
              ))}
            </datalist>
            <Select
              label={t('shopPanel.productForm.foodTypeLabel')}
              value={values.foodType}
              onChange={set('foodType')}
              options={['veg', 'nonVeg'].map((v) => ({ value: v, label: t(`foodType.${v}`) }))}
            />
            <Card padding="sm">
              <Toggle
                label={t('shopPanel.productForm.inStockLabel')}
                checked={values.inStock}
                onChange={(v) => setValues((x) => ({ ...x, inStock: v }))}
              />
            </Card>

            {!isNew && (
              <Button variant="ghost" iconLeft={<TrashIcon size={18} />} className={s.delete} onClick={() => setConfirmDelete(true)}>
                {t('shopPanel.productForm.delete')}
              </Button>
            )}
          </form>
        ) : null}
      </main>

      {values && (
        <div className={p.footerBar}>
          <div className={p.footerInner}>
            <Button type="submit" form="product-form" size="lg" block loading={saving}>
              {t('shopPanel.productForm.save')}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('shopPanel.productForm.deleteTitle')}
        message={t('shopPanel.productForm.deleteBody', { name: product?.name || '' })}
        confirmLabel={t('common.delete')}
        tone="danger"
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      />
    </>
  );
}
