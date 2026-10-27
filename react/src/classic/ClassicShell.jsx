// The classic look, mounted on /classic: header, the three pages, the bag
// drawer and the toast. Its components live in ../components and ../views.
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from '../store.js';
import { uiStore, setCartOpen } from '../state/ui.js';
import { BaseContext, saveStyle } from '../shared/shopStyle.js';
import AppHeader from '../components/AppHeader.jsx';
import CartPanel from '../components/CartPanel.jsx';
import Modal from '../components/Modal.jsx';
import Toast from '../components/Toast.jsx';
import MenuView from '../views/MenuView.jsx';
import CheckoutView from '../views/CheckoutView.jsx';
import ConfirmationView from '../views/ConfirmationView.jsx';

const BASE = '/classic';

export default function ClassicShell() {
  const { cartOpen } = useStore(uiStore);

  useEffect(() => {
    saveStyle('classic');
    document.documentElement.dataset.style = 'classic';
  }, []);

  return (
    <BaseContext.Provider value={BASE}>
      <AppHeader />
      <main id="main">
        <Routes>
          <Route index element={<MenuView />} />
          <Route path="checkout" element={<CheckoutView />} />
          <Route path="order/:id" element={<ConfirmationView />} />
          <Route path="*" element={<Navigate to={BASE} replace />} />
        </Routes>
      </main>
      <Modal open={cartOpen} label="Your order" variant="drawer" onClose={() => setCartOpen(false)}>
        <CartPanel inDrawer onClose={() => setCartOpen(false)} />
      </Modal>
      <Toast />
    </BaseContext.Provider>
  );
}
