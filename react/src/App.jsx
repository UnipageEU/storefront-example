import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useStore } from './store.js';
import { shopStore, loadStore, loadMenu } from './state/shop.js';
import { setCartOpen } from './state/ui.js';
import { savedStyle } from './shared/shopStyle.js';
import Icon from './components/Icon.jsx';
import ChooserView from './chooser/ChooserView.jsx';
import ClassicShell from './classic/ClassicShell.jsx';
import EditorialShell from './editorial/EditorialShell.jsx';
import DinerShell from './diner/DinerShell.jsx';
import './App.css';

async function boot() {
  await loadStore();
  if (shopStore.get().store) loadMenu();
}

/** The relay's payment return is `/order/{id}`: open it in the look the visitor chose. */
function OrderReturn() {
  const { id } = useParams();
  return <Navigate to={`/${savedStyle()}/order/${id}`} replace />;
}

export default function App() {
  const shop = useStore(shopStore);
  const location = useLocation();

  useEffect(() => {
    boot();
  }, []);

  // The drawer never survives a page change; a new page starts at the top.
  useEffect(() => {
    setCartOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (shop.loadingStore && !shop.store) {
    return (
      <main id="main" className="boot container" aria-busy="true">
        <div className="skel" style={{ height: 46, width: '36%' }} />
        <div className="skel" style={{ height: 52, width: '56%', marginTop: 24 }} />
        <div className="skel" style={{ height: 44, width: 200, marginTop: 24 }} />
        <div className="skel" style={{ height: 32, width: 180, marginTop: 64 }} />
        {[1, 2, 3, 4].map((i) => <div key={i} className="skel" style={{ height: 72, marginTop: 12 }} />)}
      </main>
    );
  }
  if (shop.storeError && !shop.store) {
    return (
      <main id="main" className="container boot-error">
        <div className="boot-error-card">
          <h1>We could not load the shop</h1>
          <p className="muted">{shop.storeError.message}</p>
          <button type="button" className="btn btn-primary" onClick={boot}>
            <Icon name="refresh" size={18} /> Try again
          </button>
        </div>
      </main>
    );
  }
  if (!shop.store) return null;

  return (
    <Routes>
      <Route path="/" element={<ChooserView />} />
      <Route path="/classic/*" element={<ClassicShell />} />
      <Route path="/editorial/*" element={<EditorialShell />} />
      <Route path="/diner/*" element={<DinerShell />} />
      <Route path="/order/:id" element={<OrderReturn />} />
      <Route path="/checkout" element={<Navigate to={`/${savedStyle()}/checkout`} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
