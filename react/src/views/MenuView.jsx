import { useState } from 'react';
import { useStore } from '../store.js';
import { shopStore, loadMenu, todayHours, acceptsOrdersOf, currencyOf } from '../state/shop.js';
import { chooseProduct } from '../shared/useProductDetail.js';
import { joinAddress, money } from '../format.js';
import ProductCard from '../components/ProductCard.jsx';
import ProductDialog from '../components/ProductDialog.jsx';
import CategoryNav from '../components/CategoryNav.jsx';
import OrderTypeToggle from '../components/OrderTypeToggle.jsx';
import CartPanel from '../components/CartPanel.jsx';
import CartFab from '../components/CartFab.jsx';
import Icon from '../components/Icon.jsx';
import './MenuView.css';

export default function MenuView() {
  const shop = useStore(shopStore);
  const store = shop.store;
  const categories = shop.menu?.categories || [];
  const cover = store?.branding?.coverImage || null;
  const acceptsOrders = acceptsOrdersOf(shop);
  const hours = todayHours(shop);
  const [dialogProduct, setDialogProduct] = useState(null);

  const choose = (product) => chooseProduct(product, setDialogProduct);

  let menu;
  if (shop.menuError) {
    menu = (
      <div className="banner banner-danger" role="alert">
        <Icon name="alert" size={18} />
        <div>
          <strong>We could not load the menu</strong>
          <span className="banner-text">{shop.menuError.message}</span>
          <div><button type="button" className="btn btn-secondary banner-action" onClick={loadMenu}>Try again</button></div>
        </div>
      </div>
    );
  } else if (shop.loadingMenu && !shop.menu) {
    menu = (
      <div aria-busy="true" aria-label="Loading the menu">
        {[1, 2].map((s) => (
          <div key={s} className="section">
            <div className="skel" style={{ height: 32, width: 200, marginBottom: 16 }} />
            <div className="grid">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skel skel-row" />)}
            </div>
          </div>
        ))}
      </div>
    );
  } else if (!categories.length) {
    menu = (
      <div className="empty">
        <h2>Nothing on the menu yet</h2>
        <p className="muted">There is nothing to order for {shop.orderType === 'DELIVERY' ? 'delivery' : 'pickup'} at the moment.</p>
      </div>
    );
  } else {
    menu = (
      <div className={shop.loadingMenu ? 'is-refreshing' : undefined}>
        {categories.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} data-cat={c.id} className="section" aria-labelledby={`cat-title-${c.id}`}>
            <header className="section-head">
              <h2 id={`cat-title-${c.id}`}>{c.name}</h2>
              {c.description && <p className="muted">{c.description}</p>}
            </header>
            <div className="grid">
              {c.products.map((p) => <ProductCard key={p.id} product={p} onChoose={choose} />)}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="menu-page">
      <section className={`hero container${cover ? ' has-cover' : ''}`}>
        <div className="hero-main">
          <h1 className="hero-title">{store.name}</h1>
          <dl className="hero-facts">
            {joinAddress(store.address) && (
              <div>
                <dt>Address</dt>
                <dd>{joinAddress(store.address)}</dd>
              </div>
            )}
            {hours && (
              <div>
                <dt>{hours.open ? 'Today' : 'Hours'}</dt>
                <dd className="tabular">{hours.text}</dd>
              </div>
            )}
            {store.phone && (
              <div>
                <dt>Phone</dt>
                <dd><a href={`tel:${store.phone.replace(/\s+/g, '')}`}>{store.phone}</a></dd>
              </div>
            )}
          </dl>
          <div className="hero-bar">
            {acceptsOrders && <OrderTypeToggle />}
            {shop.orderType === 'DELIVERY' && store.delivery?.minimumAmount > 0 && (
              <p className="hero-note muted">Minimum order for delivery {money(store.delivery.minimumAmount, currencyOf(shop))}</p>
            )}
          </div>
          {!acceptsOrders && (
            <div className="banner banner-warning closed" role="status">
              <Icon name="clock" size={18} />
              <div>
                <strong>We are not taking orders right now</strong>
                <span className="banner-text">Have a look at the menu, and come back during opening hours.</span>
              </div>
            </div>
          )}
        </div>
        {cover && (
          <figure className="hero-photo">
            <img src={cover} alt="" className="hero-cover" fetchPriority="high" />
          </figure>
        )}
      </section>

      {categories.length > 0 && <CategoryNav categories={categories} />}

      <div className="layout container">
        <div className="menu-col">{menu}</div>
        <aside className="cart-col" aria-label="Your order">
          <div className="cart-sticky card">
            <CartPanel />
          </div>
        </aside>
      </div>

      <ProductDialog product={dialogProduct} onClose={() => setDialogProduct(null)} />
      <CartFab />
    </div>
  );
}
