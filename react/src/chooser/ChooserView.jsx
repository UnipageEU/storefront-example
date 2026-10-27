// The landing page: one restaurant, three looks. Each card is a small live
// rendering in its own style, with the restaurant's real name, brand colour
// and first dishes from /store and /menu.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store.js';
import { shopStore, currencyOf } from '../state/shop.js';
import { cartStore, itemCount } from '../state/cart.js';
import { money } from '../format.js';
import { STYLES, lastStyle } from '../shared/shopStyle.js';
import './chooser.css';

function firstDishes(menu, n) {
  const out = [];
  for (const c of menu?.categories || []) {
    for (const p of c.products) {
      if (out.length < n) out.push({ ...p, category: c.name });
    }
  }
  return out;
}

function ClassicPreview({ store, dishes, currency }) {
  return (
    <div className="ch-prev ch-prev-classic" aria-hidden="true">
      <div className="ch-c-bar">{store.name}</div>
      <div className="ch-c-intro">
        <strong>{store.name}</strong>
        <span className="ch-c-seg"><i className="on">Pickup</i><i>Delivery</i></span>
      </div>
      <ul className="ch-c-rows">
        {dishes.slice(0, 4).map((d, i) => (
          <li key={d.id}>
            <b>{d.name}</b>
            <span className="ch-c-price">{money(d.price, currency)}</span>
            <i className={`ch-c-plus${i === 0 ? ' on' : ''}`}>+</i>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditorialPreview({ store, dishes, currency }) {
  return (
    <div className="ch-prev ch-prev-editorial" aria-hidden="true">
      <div className="ch-e-strip">{store.name}</div>
      <p className="ch-e-title">{store.name}</p>
      <div className="ch-e-body">
        <ol className="ch-e-list">
          {dishes.slice(0, 5).map((d, i) => (
            <li key={d.id}>
              <span className="ch-e-no">{String(i + 1).padStart(2, '0')}</span>
              <span className="ch-e-name">{d.name}</span>
              <span className="ch-e-dots" />
              <span className="ch-e-price">{money(d.price, currency)}</span>
            </li>
          ))}
        </ol>
        <div className="ch-e-receipt">
          <span>Order slip</span>
          <span>1 × {dishes[0]?.name || 'Dish'}</span>
          <span className="ch-e-rule" />
          <span>Total {money(dishes[0]?.price || 0, currency)}</span>
          <span className="ch-e-btn">Order</span>
        </div>
      </div>
    </div>
  );
}

function DinerPreview({ store, dishes, currency }) {
  return (
    <div className="ch-prev ch-prev-diner" aria-hidden="true">
      <div className="ch-d-sign-row">
        <span className="ch-d-stripes" />
        <span className="ch-d-sign">{store.name}</span>
        <span className="ch-d-stripes" />
      </div>
      <div className="ch-d-body">
        <div className="ch-d-card">
          <span className="ch-d-cat">{dishes[0]?.category || 'Menu'}</span>
          <ul className="ch-d-list">
            {dishes.slice(0, 4).map((d) => (
              <li key={d.id}>
                <span className="ch-d-name">{d.name}</span>
                <span className="ch-d-dots" />
                <span className="ch-d-price">{money(d.price, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ch-d-check">
          <span className="ch-d-check-t">Guest check</span>
          <span className="ch-d-check-row"><b>1</b> {dishes[0]?.name || 'Dish'}</span>
          <span className="ch-d-check-row ch-d-check-total">Total {money(dishes[0]?.price || 0, currency)}</span>
        </div>
      </div>
    </div>
  );
}

export default function ChooserView() {
  const shop = useStore(shopStore);
  const cart = useStore(cartStore);
  const store = shop.store;
  const currency = currencyOf(shop);
  const dishes = firstDishes(shop.menu, 5);
  const last = lastStyle();
  const [logoFailed, setLogoFailed] = useState(false);
  const count = itemCount(cart);

  useEffect(() => {
    document.documentElement.dataset.style = 'chooser';
    document.title = `${store.name} | Choose a style`;
  }, [store.name]);

  const previews = { classic: ClassicPreview, editorial: EditorialPreview, diner: DinerPreview };

  return (
    <main id="main" className="ch">
      <div className="ch-bar">
        <div className="ch-bar-in">
          {store.branding?.logo && !logoFailed && <img src={store.branding.logo} alt="" className="ch-logo" width="32" height="32" onError={() => setLogoFailed(true)} />}
          <span className="ch-wordmark">{store.name}</span>
        </div>
      </div>
      <header className="ch-head">
        <h1 className="ch-title">One restaurant, three shops.</h1>
        <p className="ch-lede">
          Same restaurant, same menu, same prices and the same checkout: all three styles run on the same Unipage Storefront API
          and the same order relay. Only the design is different. Pick the one you want to see.
        </p>
      </header>

      <ul className="ch-cards">
        {STYLES.map((s) => {
          const Preview = previews[s.key];
          return (
            <li key={s.key}>
              <Link to={`/${s.key}`} className={`ch-card ch-card-${s.key}`} aria-label={`Open the ${s.label.toLowerCase()} shop: ${s.blurb}`}>
                <Preview store={store} dishes={dishes} currency={currency} />
                <span className="ch-card-text">
                  <span className="ch-card-title">
                    {s.label}
                    {s.key === last && <span className="ch-badge">Last used</span>}
                  </span>
                  <span className="ch-card-blurb">{s.blurb}</span>
                  <span className="ch-card-cta">Open the {s.label.toLowerCase()} shop</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="ch-foot">
        {count > 0 ? `Your ${count} ${count === 1 ? 'item comes' : 'items come'} along to whichever style you choose. ` : ''}
        You can switch style at any time from the top of the shop.
      </p>
    </main>
  );
}
