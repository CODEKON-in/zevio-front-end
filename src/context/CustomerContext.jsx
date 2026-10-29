import { createContext, useCallback, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useCart } from './CartContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useAccountGone } from '../hooks/useAccountGone.js';
import { getCustomerById, saveAddress as saveAddressApi, deleteAddress as deleteAddressApi } from '../services/userService.js';

const CustomerContext = createContext(null);

/**
 * Customer profile + saved addresses (customer section only).
 * Provides:
 *  - customer, loading, error, reload
 *  - addresses: Array
 *  - selectedAddress: the cart's chosen address, or the first saved one, or null
 *  - saveAddress(address) → saved address (create if no id)
 *  - deleteAddress(id)
 */
export function CustomerProvider({ children }) {
  const { user } = useAuth();
  const { cart, setAddress } = useCart();
  const customerId = user?.customerId;

  const { data: customer, loading, error, reload, setData } = useAsync(
    () => (customerId ? getCustomerById(customerId) : Promise.resolve(null)),
    [customerId],
  );
  useAccountGone(error, customer);

  const saveAddress = useCallback(
    async (address) => {
      const saved = await saveAddressApi(customerId, address);
      setData((c) =>
        c
          ? {
              ...c,
              addresses: address.id ? c.addresses.map((a) => (a.id === saved.id ? saved : a)) : [...c.addresses, saved],
            }
          : c,
      );
      return saved;
    },
    [customerId, setData],
  );

  const deleteAddress = useCallback(
    async (id) => {
      await deleteAddressApi(customerId, id);
      setData((c) => (c ? { ...c, addresses: c.addresses.filter((a) => a.id !== id) } : c));
      if (cart.addressId === id) setAddress(null);
    },
    [customerId, setData, cart.addressId, setAddress],
  );

  const value = useMemo(() => {
    const addresses = customer?.addresses || [];
    const selectedAddress = addresses.find((a) => a.id === cart.addressId) || addresses[0] || null;
    return { customer, loading, error, reload, addresses, selectedAddress, saveAddress, deleteAddress };
  }, [customer, loading, error, reload, cart.addressId, saveAddress, deleteAddress]);

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used inside CustomerProvider');
  return ctx;
}
