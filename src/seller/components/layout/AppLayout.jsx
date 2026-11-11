import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSellerAuth } from '../../context/SellerAuthContext';
import { subscribeToShopOrders } from '../../services/orders';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import './Layout.css';

export default function AppLayout() {
  const { user } = useSellerAuth();
  const shopId = user?.shopId;
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    if (!shopId) return;

    // The badge on the Orders tab: how many are still waiting to be accepted.
    const unsubOrders = subscribeToShopOrders(shopId, ({ orders }) => {
      const pendingCount = (orders || []).filter(
        (o) => o.normalizedStatus === 'new'
      ).length;
      setNewOrdersCount(pendingCount);
    });

    return () => unsubOrders();
  }, [shopId]);

  return (
    <div className="app-shell">
      <Topbar />

      <main className="app-main">
        <Outlet />
      </main>

      <BottomNav newOrdersCount={newOrdersCount} />
    </div>
  );
}
