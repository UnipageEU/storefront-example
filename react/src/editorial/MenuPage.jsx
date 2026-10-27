// The front page and the menu: the restaurant's name set large, the
// categories as numbered chapters, every dish numbered through the issue, and
// the receipt alongside (a drawer on phones).
import { useState } from 'react';
import { useStore } from '../store.js';
import { shopStore, loadMenu, todayHours, acceptsOrdersOf, currencyOf } from '../state/shop.js';
import { cartStore, itemCount, displayTotal } from '../state/cart.js';
import { setCartOpen } from '../state/ui.js';
import { joinAddress, money } from '../format.js';
import { chooseProduct } from '../shared/useProductDetail.js';
import OrderTypeSwitch from './OrderTypeSwitch.jsx';
import Contents, { chapterId } from './Contents.jsx';
import Entry from './Entry.jsx';
import ProductSheet from './ProductSheet.jsx';
import Receipt from './Receipt.jsx';
import { roman } from './roman.js';
import Breakable from './Breakable.jsx';

export default function MenuPage() {
  const shop = useStore(shopStore);
  const cart = useStore(cartStore);
  const store = shop.store;
  const currency = currencyOf(shop);
  const categories = shop.menu?.categories || [];
  const acceptsOrders = acceptsOrdersOf(shop);
  const hours = todayHours(shop);
  const [dialog, setDialog] = useState(null); // { product, number }
  const dishCount = categories.reduce((n, c) => n + c.products.length, 0);
  const count = itemCount(cart);

  // Dishes are numbered through the whole menu, like an index.
  let running = 0;
  const numbered = categories.map((c) => ({ ...c, start: running + 1, end: (running += c.products.length) }));

  let menu;
  if (shop.menuError) {
    menu = (
      <div className="ed-r-alert" role="alert">
        <strong>We could not load the menu.</strong> {shop.menuError.message}{' '}
        <button type="button" className="ed-textlink" onClick={loadMenu}>Try again</button>
      </div>
    );
  } else if (shop.loadingMenu && !shop.menu) {
    menu = (
      <div aria-busy="true" aria-label="Loading the menu">
        {[1, 2].map((s) => (
          <div key={s} className="ed-chapter">
            <div className="skel" style={{ height: 40, width: 220, marginBottom: 24 }} />
            {[1, 2, 3, 4].map((i) => <div key={i} className="skel" style={{ height: 24, marginBottom: 16 }} />)}
          </div>
        ))}
      </div>
    );
  } else if (!categories.length) {
    menu = (
      <div className="ed-blank">
        <h2>Nothing on the menu yet.</h2>
        <p>There is nothing to order for {shop.orderType === 'DELIVERY' ? 'delivery' : 'pickup'} at the moment.</p>
      </div>
    );
  } else {
    menu = (
      <div className={shop.loadingMenu ? 'is-refreshing' : undefined}>
        {numbered.map((c, ci) => {
          return (
            <section key={c.id} id={chapterId(c.id)} data-cat={c.id} className="ed-chapter" aria-labelledby={`ed-ch-${c.id}`}>
              <header className="ed-chapter-head">
                <h2 id={`ed-ch-${c.id}`} className="ed-chapter-title"><Breakable text={c.name} /></h2>
                <p className="ed-chapter-no" aria-hidden="true">{roman(ci + 1)}</p>
                <p className="ed-chapter-range">
                  N° {String(c.start).padStart(2, '0')} to {String(c.end).padStart(2, '0')}
                </p>
                {c.description && <blockquote className="ed-pull">{c.description}</blockquote>}
              </header>
              <ol className="ed-entries">
                {c.products.map((p, i) => (
                  <Entry
                    key={p.id}
                    product={p}
                    number={c.start + i}
                    onChoose={(product) => chooseProduct(product, (x) => setDialog({ product: x, number: c.start + i }))}
                  />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="ed-menu-page">
      <section className="ed-front" aria-labelledby="ed-title">
        {/* The name painted on the restaurant's colour, the way a burger joint paints its sign. */}
        <div className="ed-front-band">
          <div className="ed-wrap ed-front-band-inner">
            <h1 id="ed-title" className="ed-title"><Breakable text={store.name} /></h1>
            <p className="ed-deck">
              {dishCount > 0
                ? `${dishCount} dishes in ${categories.length} chapters, prepared to order${store.address?.city ? ` in ${store.address.city}` : ''}. Choose a time, we do the rest.`
                : 'Prepared to order. Choose a time, we do the rest.'}
            </p>
          </div>
        </div>
        <div className="ed-wrap ed-front-below">
          <dl className="ed-front-facts">
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
            <div className="ed-front-how">
              <span className="ed-front-how-q">How would you like it?</span>
              <OrderTypeSwitch />
              {shop.orderType === 'DELIVERY' && store.delivery?.minimumAmount > 0 && (
                <span className="ed-front-min">Delivery from {money(store.delivery.minimumAmount, currency)}</span>
              )}
            </div>
          )}
          {!acceptsOrders && (
            <p className="ed-r-alert" role="status">
              <strong>We are not taking orders right now.</strong> Have a look at the menu, and come back during opening hours.
            </p>
          )}
        </div>
      </section>

      {categories.length > 0 && <Contents categories={categories} />}

      <div className="ed-wrap ed-layout">
        <div className="ed-menu">{menu}</div>
        <aside className="ed-side" aria-label="Your receipt">
          <div className="ed-side-sticky">
            <Receipt />
          </div>
        </aside>
      </div>

      <ProductSheet product={dialog?.product || null} number={dialog?.number} onClose={() => setDialog(null)} />

      {count > 0 && (
        <div className="ed-receipt-bar">
          <button type="button" onClick={() => setCartOpen(true)} aria-label={`Open your receipt: ${count} items, ${money(displayTotal(cart), currency)}`}>
            <span>Receipt</span>
            <span className="ed-tab">{count}</span>
            <span className={`ed-receipt-bar-total${cart.quoting ? ' stale' : ''}`}>{money(displayTotal(cart), currency)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
