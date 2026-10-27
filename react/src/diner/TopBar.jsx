// The slim bar over every page: the restaurant's name, the way back to the
// menu (off the menu page) and to the chooser. On phones it also opens the check.
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store.js';
import { shopStore, currencyOf } from '../state/shop.js';
import { cartStore, itemCount, displayTotal } from '../state/cart.js';
import { setCartOpen } from '../state/ui.js';
import { money } from '../format.js';
import { useBase } from '../shared/shopStyle.js';

export default function TopBar() {
  const shop = useStore(shopStore);
  const cart = useStore(cartStore);
  const base = useBase();
  const onMenu = useLocation().pathname === base;
  const count = itemCount(cart);

  return (
    <header className="dn-top">
      <div className="dn-wrap dn-top-row">
        <Link to={base} className="dn-top-name" aria-label={`${shop.store.name}, the menu`}>
          {shop.store.name}
        </Link>
        <nav className="dn-top-nav" aria-label="Shop">
          {!onMenu && <Link to={base}>The menu</Link>}
          <Link to="/" title="Choose another look for this shop">Change style</Link>
          {onMenu && count > 0 && (
            <button type="button" className="dn-top-check" onClick={() => setCartOpen(true)} aria-label={`Open your guest check: ${count} items, ${money(displayTotal(cart), currencyOf(shop))}`}>
              Check <span className="dn-count">{count}</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
