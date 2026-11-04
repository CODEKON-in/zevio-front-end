import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { saveProduct } from '../../services/productService.js';
import Drawer from '../ui/Drawer.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Toggle from '../ui/Toggle.jsx';
import { DESCRIPTION_MAX, readMinQty } from '../../utils/productRules.js';
import { toPlainText } from '../../utils/text.js';
import a from '../../pages/admin/admin.module.css';

const toFoodType = (isVeg) => (isVeg === false ? 'nonVeg' : 'veg');
const fromFoodType = (v) => v !== 'nonVeg';

function toValues(product) {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    minOrderQty: String(product?.minOrderQty ?? 1),
    section: product?.section ?? '',
    foodType: product ? toFoodType(product.isVeg) : 'veg',
    inStock: product?.inStock ?? true,
    image: product?.image ?? '',
  };
}

/**
 * ProductFormDrawer — add / edit one product of a shop.
 *
 * This is the admin's version of what the shop owner used to do from their own
 * panel, so it keeps the same rules: a price above zero, a section so the menu
 * has headings, and a minimum order quantity that is either blank or a whole
 * number. A missing description is only nudged, never blocked — a shop with
 * twenty items should be able to add the twenty-first quickly.
 *
 * Props: open, shopId, product (null = new), sections (existing menu headings),
 *        onClose, onSaved(savedProduct)
 */
export default function ProductFormDrawer({ open, shopId, product, sections = [], onClose, onSaved }) {
  const { showToast } = useToast();
  const [values, setValues] = useState(() => toValues(product));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [nudge, setNudge] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValues(toValues(product));
      setErrors({});
      setNudge(false);
    }
  }, [open, product]);

  const set = (field) => (e) => {
    const value = field === 'description' ? e.target.value.slice(0, DESCRIPTION_MAX) : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (field === 'description') setNudge(false);
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    const er = {};
    const price = Number(values.price);
    if (!values.name.trim()) er.name = t('admin.productForm.nameError');
    if (!(price > 0)) er.price = t('admin.productForm.priceError');
    if (!values.section.trim()) er.section = t('admin.productForm.sectionError');
    const minOrderQty = readMinQty(values.minOrderQty);
    if (minOrderQty === null) er.minOrderQty = t('admin.productForm.minQtyError');
    setErrors(er);
    if (Object.keys(er).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    if (!values.description.trim()) setNudge(true); // a tip, not a blocker

    setSaving(true);
    try {
      const saved = await saveProduct({
        ...(product ? { id: product.id } : {}),
        shopId,
        name: values.name.trim(),
        // Stored as plain text: no markup, no stray line breaks.
        description: toPlainText(values.description, DESCRIPTION_MAX),
        price: Math.round(price * 100) / 100,
        minOrderQty,
        section: values.section.trim(),
        isVeg: fromFoodType(values.foodType),
        inStock: values.inStock,
        image: values.image.trim(),
      });
      showToast(product ? t('admin.productForm.updated') : t('admin.productForm.created'), { type: 'success' });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      showToast(t(`errors.${err.code || 'NETWORK'}`), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const sectionOptions = [...new Set(sections.filter(Boolean))].map((x) => ({ value: x, label: x }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={product ? t('admin.productForm.editTitle') : t('admin.productForm.newTitle')}
      width="520px"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={saving} onClick={submit}>{t('admin.productForm.save')}</Button>
        </>
      }
    >
      <form ref={formRef} className={a.form} onSubmit={submit} noValidate>
        <Input label={t('admin.productForm.name')} required value={values.name} onChange={set('name')} error={errors.name} />

        <Input
          label={t('admin.productForm.description')}
          multiline
          rows={2}
          hint={t('admin.productForm.descriptionHint', { max: DESCRIPTION_MAX })}
          value={values.description}
          onChange={set('description')}
        />
        {nudge && <p className={a.muted}>{t('admin.productForm.descriptionNudge')}</p>}

        <div className={a.twoCols}>
          <Input
            label={t('admin.productForm.price')}
            required
            prefix="₹"
            type="number"
            inputMode="decimal"
            min="1"
            step="0.5"
            value={values.price}
            onChange={set('price')}
            error={errors.price}
          />
          <Input
            label={t('admin.productForm.minQty')}
            hint={t('admin.productForm.minQtyHint')}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={values.minOrderQty}
            onChange={set('minOrderQty')}
            error={errors.minOrderQty}
          />
        </div>

        <div className={a.twoCols}>
          {/* A free-typed heading, with the shop's existing ones one tap away,
              so a menu does not end up with "Snacks", "snacks" and "Snack". */}
          <Input
            label={t('admin.productForm.section')}
            hint={t('admin.productForm.sectionHint')}
            required
            list="product-sections"
            value={values.section}
            onChange={set('section')}
            error={errors.section}
          />
          <Select
            label={t('admin.productForm.foodType')}
            value={values.foodType}
            onChange={set('foodType')}
            options={[
              { value: 'veg', label: t('foodType.veg') },
              { value: 'nonVeg', label: t('foodType.nonVeg') },
            ]}
          />
        </div>
        <datalist id="product-sections">
          {sectionOptions.map((o) => (
            <option key={o.value} value={o.value} />
          ))}
        </datalist>

        <Input
          label={t('admin.productForm.image')}
          hint={t('admin.productForm.imageHint')}
          type="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://…"
          value={values.image}
          onChange={set('image')}
        />

        <Toggle
          label={t('admin.productForm.inStock')}
          description={t('admin.productForm.inStockHint')}
          checked={values.inStock}
          onChange={(v) => setValues((x) => ({ ...x, inStock: v }))}
        />
      </form>
    </Drawer>
  );
}
