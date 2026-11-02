import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { readStorage, writeStorage } from '../utils/storage.js';
import { MAX_ITEM_QTY, STORAGE_KEYS } from '../utils/constants.js';
import { lineMin } from '../utils/productRules.js';

const CartContext = createContext(null);

const EMPTY_CART = { shopId: null, shopName: '', items: [], instructions: '', addressId: null };

// The minimum travels with the line: the cart screen has no products loaded,
// only what was saved here, and it still has to keep the floor.
const toLine = (product) => {
  const minQty = lineMin(product);
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    isVeg: product.isVeg,
    minQty,
    qty: minQty,
  };
};

const clampQty = (qty, minQty) => Math.max(minQty || 1, Math.min(qty, MAX_ITEM_QTY));

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
      // 0 still means "take it out"; anything above that is held at the minimum.
      const items = state.items
        .map((i) => (i.productId === action.productId ? { ...i, qty: action.qty <= 0 ? 0 : clampQty(action.qty, i.minQty) } : i))
        .filter((i) => i.qty > 0);
      return items.length ? { ...state, items } : { ...EMPTY_CART, addressId: state.addressId };
    }
    case 'SET_MINS': {
      // Fresh minimums from the shop: raise anything that now falls short.
      const items = state.items.map((i) => {
        const minQty = action.mins[i.productId] ?? i.minQty ?? 1;
        return { ...i, minQty, qty: clampQty(i.qty, minQty) };
      });
      return { ...state, items };
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
        items: action.lines.map(({ product, qty }) => {
          const line = toLine(product);
          return { ...line, qty: clampQty(qty, line.minQty) };
        }),
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
 *  - cart: { shopId, shopName, items:[{productId,name,price,isVeg,minQty,qty}], instructions, addressId }
 *  - itemCount, itemTotal
 *  - isFromOtherShop(product) → true if adding would break the one-shop rule
 *  - addItem(product, shop) → 'added' | 'conflict'
 *  - replaceWith(product, shop) — clear cart and add (after user confirms)
 *  - loadItems(shop, [{ product, qty }]) — replace the cart (used by Reorder)
 *  - increment(productId), decrement(productId), setQty(productId, qty), removeItem(productId)
 *  - applyMinimums({ [productId]: minQty }) — re-floor a stale cart
 *  - getMinQty(productId)
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
      applyMinimums: (mins) => dispatch({ type: 'SET_MINS', mins: mins || {} }),
      setInstructions: (value) => dispatch({ type: 'SET_INSTRUCTIONS', value }),
      setAddress: (addressId) => dispatch({ type: 'SET_ADDRESS', addressId }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
    }),
    [addItem, isFromOtherShop],
  );

  const value = useMemo(() => {
    const qtyById = Object.fromEntries(cart.items.map((i) => [i.productId, i.qty]));
    const minById = Object.fromEntries(cart.items.map((i) => [i.productId, i.minQty || 1]));
    return {
      cart,
      itemCount: cart.items.reduce((sum, i) => sum + i.qty, 0),
      itemTotal: cart.items.reduce((sum, i) => sum + i.qty * i.price, 0),
      getQty: (productId) => qtyById[productId] || 0,
      getMinQty: (productId) => minById[productId] || 1,
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
