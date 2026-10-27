// The bag as the waitress's guest check: ruled lines that fill in as dishes
// are added, the quote's totals, and the way to the checkout. Same data and
// rules as the classic CartPanel.
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.js';
import { cartStore, itemCount } from '../state/cart.js';
import { shopStore, currencyOf, acceptsOrdersOf, timezoneOf, ORDER_TYPE_LABELS } from '../state/shop.js';
import { money, timeAt } from '../format.js';
import { useBase } from '../shared/shopStyle.js';
import QuoteTotals from '../components/QuoteTotals.jsx';
import CheckLine from './CheckLine.jsx';

/** The check's printed header: the name, its number and the three boxes under it. */
export function CheckHead({ id, number, cells }) {
  return (
    <header className="dn-gc-head">
      <div className="dn-gc-title">
        <h2 id={id}>Guest check</h2>
        {number && <p className="dn-gc-no">No. {number}</p>}
      </div>
      <dl className="dn-gc-cells">
        {cells.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </header>
  );
}

/** The ruled table's column heads; each line reads on its own for a screen reader. */
export const CheckColumns = () => (
  <p className="dn-gc-cols" aria-hidden="true">
    <span>Qty</span>
    <span>Item</span>
    <span>Price</span>
  </p>
);

export default function GuestCheck({ inDrawer = false, onClose }) {
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
  const titleId = inDrawer ? 'dn-gc-t-d' : 'dn-gc-t';

  function goCheckout() {
    onClose?.();
    navigate(`${base}/checkout`);
  }

  return (
    <section className={`dn-gc-wrap${inDrawer ? ' in-drawer' : ''}`} aria-labelledby={titleId}>
      {inDrawer && (
        <button type="button" className="dn-close" aria-label="Close your guest check" data-autofocus onClick={onClose}>
          Close
        </button>
      )}
      <div className="dn-gc">
        <CheckHead
          id={titleId}
          number={shop.store.id}
          cells={[
            ['Order', ORDER_TYPE_LABELS[shop.orderType] || shop.orderType],
            ['Time', now],
            ['Items', count],
          ]}
        />
        <CheckColumns />

        {!cart.lines.length ? (
          <div className="dn-gc-empty">
            <p className="dn-gc-empty-t">Nothing on the check yet.</p>
            <p>Choose a dish from the menu and it goes on here.</p>
          </div>
        ) : (
          <>
            <ol className="dn-gc-lines">
              {cart.lines.map((line, i) => <CheckLine key={line.key} line={line} index={i} />)}
            </ol>

            <div className="dn-gc-foot">
              {minimum && minimum.missing > 0 && (
                <div className="dn-gc-min">
                  <p>Add {money(minimum.missing, currency)} for delivery (min. {money(minimum.amount, currency)})</p>
                  <div className="dn-gc-bar" role="progressbar" aria-valuenow={minimumPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the delivery minimum">
                    <span style={{ transform: `scaleX(${minimumPct / 100})` }} />
                  </div>
                </div>
              )}
              {cart.quoteError ? (
                <p className="dn-alert" role="alert">
                  <strong>Could not calculate your total.</strong> {cart.quoteError.message}
                </p>
              ) : (
                topErrors.length > 0 && (
                  <ul className="dn-gc-notes">
                    {topErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )
              )}

              <QuoteTotals />

              <button type="button" className="dn-btn dn-btn-block" disabled={!(count > 0 && acceptsOrders)} onClick={goCheckout}>
                Check out
              </button>
              {!acceptsOrders && <p className="dn-gc-sub">The kitchen is not taking orders right now.</p>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
