// The running head at the top of every page: today's date in the
// restaurant's timezone, the restaurant's name, and the way back to the
// chooser. On phones it also opens the receipt.
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store.js';
import { shopStore, timezoneOf, currencyOf } from '../state/shop.js';
import { cartStore, itemCount, displayTotal } from '../state/cart.js';
import { setCartOpen } from '../state/ui.js';
import { money } from '../format.js';
import { useBase } from '../shared/shopStyle.js';

export function longToday(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  } catch {
    return new Date().toDateString();
  }
}

/** Today in the restaurant's timezone as YYYY-MM-DD, for <time dateTime>. */
function isoToday(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default function Masthead() {
  const shop = useStore(shopStore);
  const cart = useStore(cartStore);
  const base = useBase();
  const onMenu = useLocation().pathname === base;
  const count = itemCount(cart);

  return (
    <header className="ed-mast">
      <div className="ed-wrap ed-mast-row">
        <Link to={base} className="ed-mast-name" aria-label={`${shop.store.name}, the menu`}>
          {shop.store.name}
        </Link>
        <p className="ed-mast-issue">
          <time className="ed-mast-date" dateTime={isoToday(timezoneOf(shop))}>{longToday(timezoneOf(shop))}</time>
        </p>
        <nav className="ed-mast-nav" aria-label="Shop">
          {!onMenu && <Link to={base}>The menu</Link>}
          <Link to="/" className="ed-mast-style" title="Choose another look for this shop">Change style</Link>
          {onMenu && count > 0 && (
            <button type="button" className="ed-mast-receipt" onClick={() => setCartOpen(true)} aria-label={`Open your receipt: ${count} items, ${money(displayTotal(cart), currencyOf(shop))}`}>
              Receipt <span className="ed-tab">{count}</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
