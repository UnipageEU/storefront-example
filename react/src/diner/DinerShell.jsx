// The diner look, mounted on /diner: the menu as a diner's laminated menu
// card and the bag as the waitress's guest check. Same state, API and checkout
// behaviour as the other looks (../shared); only the presentation differs.
// Everything is scoped under the `.dn` class so the looks' styles never meet.
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from '../store.js';
import { uiStore, setCartOpen } from '../state/ui.js';
import { BaseContext, saveStyle } from '../shared/shopStyle.js';
import Modal from '../components/Modal.jsx';
import TopBar from './TopBar.jsx';
import GuestCheck from './GuestCheck.jsx';
import DnToast from './DnToast.jsx';
import MenuPage from './MenuPage.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import OrderPage from './OrderPage.jsx';
import './diner.css';

const BASE = '/diner';

export default function DinerShell() {
  const { cartOpen } = useStore(uiStore);

  useEffect(() => {
    saveStyle('diner');
    document.documentElement.dataset.style = 'diner';
    return () => {
      delete document.documentElement.dataset.style;
    };
  }, []);

  return (
    <BaseContext.Provider value={BASE}>
      <div className="dn">
        <TopBar />
        <main id="main">
          <Routes>
            <Route index element={<MenuPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order/:id" element={<OrderPage />} />
            <Route path="*" element={<Navigate to={BASE} replace />} />
          </Routes>
        </main>
        <DnToast />
      </div>
      <Modal open={cartOpen} label="Your guest check" variant="drawer" className="dn dn-modal" onClose={() => setCartOpen(false)}>
        <GuestCheck inDrawer onClose={() => setCartOpen(false)} />
      </Modal>
    </BaseContext.Provider>
  );
}
