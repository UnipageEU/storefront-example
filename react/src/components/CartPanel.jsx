import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.js';
import { cartStore, itemCount } from '../state/cart.js';
import { shopStore, currencyOf, acceptsOrdersOf, ORDER_TYPE_LABELS } from '../state/shop.js';
import { money } from '../format.js';
import CartLine from './CartLine.jsx';
import QuoteTotals from './QuoteTotals.jsx';
import Icon from './Icon.jsx';
import { useBase } from '../shared/shopStyle.js';
import './CartPanel.css';

/** The bag: lines, delivery minimum, quote problems, totals, "Go to checkout". */
export default function CartPanel({ inDrawer = false, onClose }) {
  const cart = useStore(cartStore);
  const shop = useStore(shopStore);
  const navigate = useNavigate();
  const base = useBase();
  const currency = currencyOf(shop);
  const acceptsOrders = acceptsOrdersOf(shop);
  const minimum = cart.quote?.minimum || null;
  const minimumPct = minimum ? Math.min(100, Math.round(((minimum.amount - minimum.missing) / minimum.amount) * 100)) : 100;
  // "Choose a delivery area" is resolved at checkout; don't block the cart on it.
  const topErrors = cart.quote?.errors || [];

  function goCheckout() {
    onClose?.();
    navigate(`${base}/checkout`);
  }

  return (
    <section className={`cart${inDrawer ? ' in-drawer' : ''}`} aria-labelledby="cart-title">
      <header className="cart-head">
        <div>
          <h2 id="cart-title">Your order</h2>
          <p className="cart-sub muted">
            <Icon name={shop.orderType === 'DELIVERY' ? 'bike' : 'store'} size={15} />
            {ORDER_TYPE_LABELS[shop.orderType] || shop.orderType}
          </p>
        </div>
        {inDrawer && (
          <button type="button" className="icon-btn" aria-label="Close your order" data-autofocus onClick={onClose}>
            <Icon name="x" />
          </button>
        )}
      </header>

      {!cart.lines.length ? (
        <div className="cart-empty">
          <p className="cart-empty-title">Your bag is empty</p>
          <p className="muted">Add something tasty from the menu to get started.</p>
        </div>
      ) : (
        <>
          <div className="cart-body">
            <ul className="cart-lines">
              {cart.lines.map((line, i) => <CartLine key={line.key} line={line} index={i} />)}
            </ul>
          </div>
          <footer className="cart-foot">
            {minimum && minimum.missing > 0 && (
              <div className="minimum">
                <div className="minimum-text">
                  <span>Add <strong className="tabular">{money(minimum.missing, currency)}</strong> more for delivery</span>
                  <span className="muted tabular">min. {money(minimum.amount, currency)}</span>
                </div>
                <div className="minimum-bar" role="progressbar" aria-valuenow={minimumPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the delivery minimum">
                  <span style={{ transform: `scaleX(${minimumPct / 100})` }} />
                </div>
              </div>
            )}
            {cart.quoteError ? (
              <div className="banner banner-danger" role="alert">
                <Icon name="alert" size={18} />
                <div>
                  <strong>Could not calculate your total</strong>
                  <span className="banner-text">{cart.quoteError.message}</span>
                </div>
              </div>
            ) : (
              topErrors.length > 0 && (
                <ul className="cart-errors">
                  {topErrors.map((e, i) => <li key={i} className="field-error"><Icon name="info" size={14} /> {e}</li>)}
                </ul>
              )
            )}
            <QuoteTotals />
            <button type="button" className="btn btn-primary btn-lg btn-block cart-cta" disabled={!(itemCount(cart) > 0 && acceptsOrders)} onClick={goCheckout}>
              <span>Go to checkout</span>
              <Icon name="arrow-right" size={18} />
            </button>
            {!acceptsOrders && <p className="muted cart-closed">The shop is not taking orders right now.</p>}
          </footer>
        </>
      )}
    </section>
  );
}
