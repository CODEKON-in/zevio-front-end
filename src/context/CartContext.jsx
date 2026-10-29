import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { readStorage, writeStorage } from '../utils/storage.js';
import { MAX_ITEM_QTY, STORAGE_KEYS } from '../utils/constants.js';

const CartContext = createContext(null);

const EMPTY_CART = { shopId: null, shopName: '', items: [], instructions: '', addressId: null };

const toLine = (product) => ({
  productId: product.id,
  name: product.name,
  price: product.price,
  isVeg: product.isVeg,
  qty: 1,
});

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { product, shop } = action;
      // One-shop rule: refuse silently here; the UI asks the user first.
      if (state.shopId && state.shopId !== product.shopId) return state;
      const exists = state.items.some((i) => i.productId === product.id);
      const items = exists
        ? state.items.map((i) => (i.productId === product.id ? { ...i, qty: Math.min(i.qty + 1, MAX_ITEM_QTY) } : i))
        : [...state.items, toLine(product)];
      return {
        ...state,
        shopId: product.shopId,
        shopName: shop?.name ?? state.shopName,
        items,
      };
    }
    case 'SET_QTY': {
      const qty = Math.max(0, Math.min(action.qty, MAX_ITEM_QTY));
      const items = state.items
        .map((i) => (i.productId === action.productId ? { ...i, qty } : i))
        .filter((i) => i.qty > 0);
      return items.length ? { ...state, items } : { ...EMPTY_CART, addressId: state.addressId };
    }
    case 'REPLACE':
      return cartReducer({ ...EMPTY_CART, addressId: state.addressId }, { type: 'ADD', product: action.product, shop: action.shop });
    case 'LOAD':
      // Reorder: replace the whole cart with given products + quantities.
      return {
        ...EMPTY_CART,
        addressId: state.addressId,
        shopId: action.shop.id,
        shopName: action.shop.name,
        items: action.lines.map(({ product, qty }) => ({ ...toLine(product), qty: Math.min(qty, MAX_ITEM_QTY) })),
      };
    case 'SET_INSTRUCTIONS':
      return { ...state, instructions: action.value };
    case 'SET_ADDRESS':
      return { ...state, addressId: action.addressId };
    case 'CLEAR':
      return { ...EMPTY_CART, addressId: state.addressId };
    default:
      return state;
  }
}

function loadCart() {
  const saved = readStorage(STORAGE_KEYS.CART, null);
  if (!saved || !Array.isArray(saved.items)) return EMPTY_CART;
  return { ...EMPTY_CART, ...saved };
}

/**
 * Provides:
 *  - cart: { shopId, shopName, items:[{productId,name,price,isVeg,qty}], instructions, addressId }
 *  - itemCount, itemTotal
 *  - isFromOtherShop(product) → true if adding would break the one-shop rule
 *  - addItem(product, shop) → 'added' | 'conflict'
 *  - replaceWith(product, shop) — clear cart and add (after user confirms)
 *  - loadItems(shop, [{ product, qty }]) — replace the cart (used by Reorder)
 *  - increment(productId), decrement(productId), setQty(productId, qty), removeItem(productId)
 *  - getQty(productId), setInstructions(text), setAddress(addressId), clearCart()
 */
export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  useEffect(() => {
    writeStorage(STORAGE_KEYS.CART, cart);
  }, [cart]);

  const isFromOtherShop = useCallback(
    (product) => Boolean(cartRef.current.shopId && cartRef.current.shopId !== product.shopId && cartRef.current.items.length),
    [],
  );

  const addItem = useCallback(
    (product, shop) => {
      if (isFromOtherShop(product)) return 'conflict';
      dispatch({ type: 'ADD', product, shop });
      return 'added';
    },
    [isFromOtherShop],
  );

  const actions = useMemo(
    () => ({
      addItem,
      isFromOtherShop,
      replaceWith: (product, shop) => dispatch({ type: 'REPLACE', product, shop }),
      loadItems: (shop, lines) => dispatch({ type: 'LOAD', shop, lines }),
      setQty: (productId, qty) => dispatch({ type: 'SET_QTY', productId, qty }),
      increment: (productId) => {
        const line = cartRef.current.items.find((i) => i.productId === productId);
        if (line) dispatch({ type: 'SET_QTY', productId, qty: line.qty + 1 });
      },
      decrement: (productId) => {
        const line = cartRef.current.items.find((i) => i.productId === productId);
        if (line) dispatch({ type: 'SET_QTY', productId, qty: line.qty - 1 });
      },
      removeItem: (productId) => dispatch({ type: 'SET_QTY', productId, qty: 0 }),
      setInstructions: (value) => dispatch({ type: 'SET_INSTRUCTIONS', value }),
      setAddress: (addressId) => dispatch({ type: 'SET_ADDRESS', addressId }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
    }),
    [addItem, isFromOtherShop],
  );

  const value = useMemo(() => {
    const qtyById = Object.fromEntries(cart.items.map((i) => [i.productId, i.qty]));
    return {
      cart,
      itemCount: cart.items.reduce((sum, i) => sum + i.qty, 0),
      itemTotal: cart.items.reduce((sum, i) => sum + i.qty * i.price, 0),
      getQty: (productId) => qtyById[productId] || 0,
      ...actions,
    };
  }, [cart, actions]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
