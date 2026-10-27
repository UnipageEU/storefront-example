import { useStore } from '../store.js';
import { cartStore, itemCount, displayTotal } from '../state/cart.js';
import { shopStore, currencyOf } from '../state/shop.js';
import { setCartOpen } from '../state/ui.js';
import { money } from '../format.js';
import Icon from './Icon.jsx';
import './CartFab.css';

/** The floating "View order" button on phones and tablets. */
export default function CartFab() {
  const cart = useStore(cartStore);
  const currency = currencyOf(useStore(shopStore));
  const count = itemCount(cart);
  if (count === 0) return null;
  const total = money(displayTotal(cart), currency);

  return (
    <div className="fab-wrap">
      <button type="button" className="fab" aria-label={`View your order: ${count} items, ${total}`} onClick={() => setCartOpen(true)}>
        <span className="fab-count tabular">{count}</span>
        <span className="fab-label">View order</span>
        <span className={`fab-total tabular${cart.quoting ? ' stale' : ''}`}>{total}</span>
        <Icon name="bag" size={18} />
      </button>
    </div>
  );
}
