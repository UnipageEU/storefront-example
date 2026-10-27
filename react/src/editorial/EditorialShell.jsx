// The editorial look, mounted on /editorial: the menu as a magazine and the
// bag as a receipt. Same state, API and checkout behaviour as the classic
// look (../shared); only the presentation differs. Everything is scoped under
// the `.ed` class so the two looks' styles never meet.
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from '../store.js';
import { uiStore, setCartOpen } from '../state/ui.js';
import { BaseContext, saveStyle } from '../shared/shopStyle.js';
import Modal from '../components/Modal.jsx';
import Masthead from './Masthead.jsx';
import Receipt from './Receipt.jsx';
import EdToast from './EdToast.jsx';
import MenuPage from './MenuPage.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import OrderPage from './OrderPage.jsx';
import './editorial.css';

const BASE = '/editorial';

export default function EditorialShell() {
  const { cartOpen } = useStore(uiStore);

  useEffect(() => {
    saveStyle('editorial');
    document.documentElement.dataset.style = 'editorial';
    return () => {
      delete document.documentElement.dataset.style;
    };
  }, []);

  return (
    <BaseContext.Provider value={BASE}>
      <div className="ed">
        <Masthead />
        <main id="main">
          <Routes>
            <Route index element={<MenuPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order/:id" element={<OrderPage />} />
            <Route path="*" element={<Navigate to={BASE} replace />} />
          </Routes>
        </main>
        <EdToast />
      </div>
      <Modal open={cartOpen} label="Your receipt" variant="drawer" className="ed ed-modal" onClose={() => setCartOpen(false)}>
        <Receipt inDrawer onClose={() => setCartOpen(false)} />
      </Modal>
    </BaseContext.Provider>
  );
}
