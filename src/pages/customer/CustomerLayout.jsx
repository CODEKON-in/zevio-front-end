import { Outlet } from 'react-router-dom';
import BottomNav from '../../components/customer/BottomNav.jsx';

/** Layout for the 4 tab pages (Home, Search, Orders, Profile): page + bottom nav. */
export default function CustomerLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
