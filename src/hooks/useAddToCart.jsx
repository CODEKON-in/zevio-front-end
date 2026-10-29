import { useCallback, useState } from 'react';
import { t } from '../i18n/index.js';
import { useCart } from '../context/CartContext.jsx';
import BottomSheet from '../components/ui/BottomSheet.jsx';
import Button from '../components/ui/Button.jsx';

/**
 * Adds products to the cart while enforcing the ONE-SHOP rule.
 * If the cart already has items from another shop, a bottom sheet asks
 * "Clear cart and add from this shop?".
 *
 *   const { addProduct, conflictSheet } = useAddToCart(shop);
 *   ... <ProductCard onAdd={addProduct} /> ... {conflictSheet}
 */
export function useAddToCart(shop) {
  const { addItem, replaceWith, cart } = useCart();
  const [pending, setPending] = useState(null);

  const addProduct = useCallback(
    (product) => {
      if (addItem(product, shop) === 'conflict') setPending(product);
    },
    [addItem, shop],
  );

  const close = () => setPending(null);
  const confirm = () => {
    replaceWith(pending, shop);
    setPending(null);
  };

  const conflictSheet = (
    <BottomSheet
      open={Boolean(pending)}
      onClose={close}
      title={t('shopPage.conflictTitle')}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirm}>
            {t('shopPage.conflictConfirm')}
          </Button>
        </>
      }
    >
      <p>{t('shopPage.conflictBody', { current: cart.shopName, next: shop?.name || '' })}</p>
    </BottomSheet>
  );

  return { addProduct, conflictSheet };
}
