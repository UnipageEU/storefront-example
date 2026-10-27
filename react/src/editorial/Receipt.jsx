// The bag as a till receipt: lines print in as they are added, the totals are
// the quote's, and the button goes to the checkout. Same data and rules as the
// classic CartPanel.
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.js';
import { cartStore, itemCount } from '../state/cart.js';
import { shopStore, currencyOf, acceptsOrdersOf, timezoneOf, ORDER_TYPE_LABELS } from '../state/shop.js';
import { money, timeAt } from '../format.js';
import { useBase } from '../shared/shopStyle.js';
import QuoteTotals from '../components/QuoteTotals.jsx';
import ReceiptLine from './ReceiptLine.jsx';
import Barcode from './Barcode.jsx';

export default function Receipt({ inDrawer = false, onClose }) {
  const cart = useStore(cartStore);
  const shop = useStore(shopStore);
  const navigate = useNavigate();
  const base = useBase();
  const currency = currencyOf(shop);
  const acceptsOrders = acceptsOrdersOf(shop);
  const minimum = cart.quote?.minimum || null;
  const minimumPct = minimum ? Math.min(100, Math.round(((minimum.amount - minimum.missing) / minimum.amount) * 100)) : 100;
  const topErrors = cart.quote?.errors || [];
  const count = itemCount(cart);
  const now = timeAt(Math.floor(Date.now() / 1000), timezoneOf(shop));

  function goCheckout() {
    onClose?.();
    navigate(`${base}/checkout`);
  }

  return (
    <section className={`ed-receipt${inDrawer ? ' in-drawer' : ''}`} aria-labelledby={inDrawer ? 'ed-receipt-t-d' : 'ed-receipt-t'}>
      {inDrawer && (
        <button type="button" className="ed-close" aria-label="Close your receipt" data-autofocus onClick={onClose}>
          Close
        </button>
      )}
      <div className="ed-paper">
        <header className="ed-r-head">
          <h2 id={inDrawer ? 'ed-receipt-t-d' : 'ed-receipt-t'} className="ed-r-shop">{shop.store.name}</h2>
          <p>Order slip / {ORDER_TYPE_LABELS[shop.orderType] || shop.orderType}</p>
          <p>{count} {count === 1 ? 'item' : 'items'} / {now}</p>
        </header>

        {!cart.lines.length ? (
          <div className="ed-r-empty">
            <p className="ed-r-empty-t">Nothing printed yet.</p>
            <p>Choose a dish from the menu and it prints here.</p>
          </div>
        ) : (
          <>
            <ol className="ed-r-lines">
              {cart.lines.map((line, i) => <ReceiptLine key={line.key} line={line} index={i} />)}
            </ol>

            {minimum && minimum.missing > 0 && (
              <div className="ed-r-min">
                <p>Add {money(minimum.missing, currency)} for delivery (min. {money(minimum.amount, currency)})</p>
                <div className="ed-r-bar" role="progressbar" aria-valuenow={minimumPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the delivery minimum">
                  <span style={{ width: `${minimumPct}%` }} />
                </div>
              </div>
            )}
            {cart.quoteError ? (
              <p className="ed-r-alert" role="alert">
                <strong>Could not calculate your total.</strong> {cart.quoteError.message}
              </p>
            ) : (
              topErrors.length > 0 && (
                <ul className="ed-r-notes">
                  {topErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )
            )}

            <QuoteTotals />

            <button type="button" className="ed-btn ed-btn-block" disabled={!(count > 0 && acceptsOrders)} onClick={goCheckout}>
              <span>Order</span>
            </button>
            {!acceptsOrders && <p className="ed-r-sub">The kitchen is not taking orders right now.</p>}
          </>
        )}
        <Barcode value={shop.store.id} />
      </div>
    </section>
  );
}
