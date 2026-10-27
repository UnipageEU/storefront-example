// The menu: the restaurant's name on its sign, the facts under it, the
// categories in two columns on the laminated card, and the guest check
// alongside (a drawer on phones).
import { useState } from 'react';
import { useStore } from '../store.js';
import { shopStore, loadMenu, todayHours, acceptsOrdersOf, currencyOf } from '../state/shop.js';
import { cartStore, itemCount, displayTotal } from '../state/cart.js';
import { setCartOpen } from '../state/ui.js';
import { joinAddress, money } from '../format.js';
import { chooseProduct } from '../shared/useProductDetail.js';
import Breakable from '../editorial/Breakable.jsx';
import OrderTypeButtons from './OrderTypeButtons.jsx';
import CategoryBar, { sectionId } from './CategoryBar.jsx';
import Dish from './Dish.jsx';
import DishSheet from './DishSheet.jsx';
import GuestCheck from './GuestCheck.jsx';

export default function MenuPage() {
  const shop = useStore(shopStore);
  const cart = useStore(cartStore);
  const store = shop.store;
  const currency = currencyOf(shop);
  const categories = shop.menu?.categories || [];
  const acceptsOrders = acceptsOrdersOf(shop);
  const hours = todayHours(shop);
  const [dialog, setDialog] = useState(null);
  const count = itemCount(cart);

  let menu;
  if (shop.menuError) {
    menu = (
      <div className="dn-alert" role="alert">
        <strong>We could not load the menu.</strong> {shop.menuError.message}{' '}
        <button type="button" className="dn-textlink" onClick={loadMenu}>Try again</button>
      </div>
    );
  } else if (shop.loadingMenu && !shop.menu) {
    menu = (
      <div className="dn-cols" aria-busy="true" aria-label="Loading the menu">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="dn-cat">
            <div className="skel" style={{ height: 32, width: 160, marginBottom: 16 }} />
            {[1, 2, 3, 4].map((i) => <div key={i} className="skel" style={{ height: 20, marginBottom: 12 }} />)}
          </div>
        ))}
      </div>
    );
  } else if (!categories.length) {
    menu = (
      <div className="dn-blank">
        <h2>Nothing on the menu yet.</h2>
        <p>There is nothing to order for {shop.orderType === 'DELIVERY' ? 'delivery' : 'pickup'} at the moment.</p>
      </div>
    );
  } else {
    menu = (
      <div className={`dn-cols${shop.loadingMenu ? ' is-refreshing' : ''}`}>
        {categories.map((c) => (
          <section key={c.id} id={sectionId(c.id)} data-cat={c.id} className="dn-cat" aria-labelledby={`dn-cat-t-${c.id}`}>
            <h2 id={`dn-cat-t-${c.id}`} className="dn-cat-title"><Breakable text={c.name} /></h2>
            {c.description && <p className="dn-cat-desc">{c.description}</p>}
            <ul className="dn-dishes">
              {c.products.map((p) => (
                <Dish key={p.id} product={p} onChoose={(product) => chooseProduct(product, setDialog)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="dn-menu-page">
      <section className="dn-front" aria-labelledby="dn-title">
        <div className="dn-wrap">
          {/* The name on the restaurant's sign, pinstripes running out from it. */}
          <div className="dn-sign-row">
            <span className="dn-pinstripes" aria-hidden="true" />
            <h1 id="dn-title" className="dn-sign"><Breakable text={store.name} /></h1>
            <span className="dn-pinstripes" aria-hidden="true" />
          </div>
          <dl className="dn-facts">
            {joinAddress(store.address) && (
              <div><dt>Address</dt><dd>{joinAddress(store.address)}</dd></div>
            )}
            {hours && (
              <div><dt>Today</dt><dd>{hours.text}</dd></div>
            )}
            {store.phone && (
              <div><dt>Telephone</dt><dd><a href={`tel:${store.phone.replace(/\s+/g, '')}`}>{store.phone}</a></dd></div>
            )}
          </dl>
          {acceptsOrders && (
            <div className="dn-how">
              <OrderTypeButtons />
              {shop.orderType === 'DELIVERY' && store.delivery?.minimumAmount > 0 && (
                <p className="dn-how-min">Delivery from {money(store.delivery.minimumAmount, currency)}</p>
              )}
            </div>
          )}
          {!acceptsOrders && (
            <p className="dn-alert dn-closed" role="status">
              <strong>We are not taking orders right now.</strong> Have a look at the menu, and come back during opening hours.
            </p>
          )}
        </div>
      </section>

      {categories.length > 0 && <CategoryBar categories={categories} />}

      <div className="dn-wrap dn-layout">
        <div className="dn-card">{menu}</div>
        <aside className="dn-side" aria-label="Your guest check">
          <GuestCheck />
        </aside>
      </div>

      <DishSheet product={dialog} onClose={() => setDialog(null)} />

      {count > 0 && (
        <div className="dn-check-bar">
          <button type="button" onClick={() => setCartOpen(true)} aria-label={`Open your guest check: ${count} items, ${money(displayTotal(cart), currency)}`}>
            <span>Guest check</span>
            <span className="dn-count">{count}</span>
            <span className={`dn-check-bar-total${cart.quoting ? ' stale' : ''}`}>{money(displayTotal(cart), currency)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
