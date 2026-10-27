// The last page of the issue: the order's live status on the left, the
// printed receipt on the right. Polling and statuses from
// shared/useOrderStatus.js.
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store.js';
import { shopStore, ORDER_TYPE_LABELS } from '../state/shop.js';
import { money, joinAddress } from '../format.js';
import { useBase } from '../shared/shopStyle.js';
import { useOrderStatus, ORDER_STEPS, stepDescription } from '../shared/useOrderStatus.js';
import { roman } from './roman.js';
import Barcode from './Barcode.jsx';

export default function OrderPage() {
  const { id } = useParams();
  const base = useBase();
  const shop = useStore(shopStore);
  const { order, error, isFinal, failed, pending, stepIndex, orderType, isDelivery, currency, when, totals, paymentText, headline } = useOrderStatus(id);

  return (
    <div className="ed-wrap ed-cf">
      <div className="ed-cf-grid">
        <div className="ed-cf-main">
          <h1 className={`ed-cf-title${failed ? ' failed' : ''}`}>{headline}</h1>
          <p className="ed-cf-ref">Order {id}</p>

          <div className="ed-cf-status" role="status" aria-live="polite">
            {order ? (
              <>
                <p className="ed-cf-label">{order.label}</p>
                {!isFinal && <p className="ed-cf-live">Updating live</p>}
              </>
            ) : (
              !error && <div className="skel" style={{ height: 28, width: 220 }} />
            )}
          </div>

          {error && (!order || error.code === 'NOT_FOUND') && (
            <p className="ed-r-alert" role="alert">
              <strong>{error.code === 'NOT_FOUND' ? 'We could not find this order.' : 'Could not load the order status.'}</strong> {error.message}
            </p>
          )}

          {order && !failed && (
            <ol className="ed-steps" aria-label="Order progress">
              {ORDER_STEPS.map((s, i) => {
                const done = i < stepIndex || (i === stepIndex && isFinal);
                return (
                  <li key={s.key} className={`ed-step${done ? ' done' : ''}${i === stepIndex && !isFinal ? ' current' : ''}`} aria-current={i === stepIndex ? 'step' : undefined}>
                    <span className="ed-step-no">{roman(i + 1)}</span>
                    <span className="ed-step-text">
                      <strong>{s.label}{done && <span className="sr-only"> (done)</span>}</strong>
                      <span>{stepDescription(s, isDelivery)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {order && (
            <dl className="ed-front-facts ed-cf-facts">
              {when && <div><dt>{isDelivery ? 'Delivery' : 'Pickup'}</dt><dd>{when}</dd></div>}
              {isDelivery && order.delivery ? (
                <div><dt>Address</dt><dd>{order.delivery.street} {order.delivery.number}, {order.delivery.postcode} {order.delivery.city}</dd></div>
              ) : (
                !isDelivery && shop.store?.address && <div><dt>Pick up at</dt><dd>{shop.store.name}, {joinAddress(shop.store.address)}</dd></div>
              )}
              {paymentText && <div><dt>Payment</dt><dd>{paymentText}</dd></div>}
              {order.customer?.email && <div><dt>Confirmation</dt><dd>{order.customer.email}</dd></div>}
            </dl>
          )}

          <div className="ed-cf-actions">
            <Link to={base} className="ed-btn">Back to the menu</Link>
            {shop.store?.phone && (
              <a href={`tel:${shop.store.phone.replace(/\s+/g, '')}`} className="ed-textlink">Call {shop.store.name}</a>
            )}
          </div>
        </div>

        {order?.lines?.length > 0 && (
          <aside className="ed-cf-aside" aria-label="Your receipt">
            <div className="ed-paper ed-cf-paper">
              <header className="ed-r-head">
                <h2 className="ed-r-shop">{shop.store.name}</h2>
                <p>{orderType ? `${ORDER_TYPE_LABELS[orderType] || orderType} order` : 'Order'} / {id}</p>
                {when && <p>{when}</p>}
              </header>
              <ol className="ed-r-lines">
                {order.lines.map((l, i) => (
                  <li key={i} className="ed-r-line">
                    <p className="ed-r-row">
                      <span className="ed-r-qty">{l.quantity}x</span>
                      <span className="ed-r-name">{l.name}</span>
                      <span className="ed-r-amount">{money(l.total, currency)}</span>
                    </p>
                    {l.optionsLabel && <p className="ed-r-sub">{l.optionsLabel}</p>}
                  </li>
                ))}
              </ol>
              <dl className="totals">
                {totals.map((r) => (
                  <div key={r.label} className={`row${r.discount ? ' discount' : ''}`}>
                    <dt>{r.label}</dt>
                    <dd>{r.free ? 'Free' : r.discount ? `−${money(-r.amount, currency)}` : money(r.amount, currency)}</dd>
                  </div>
                ))}
                <div className="row total">
                  <dt>Total</dt>
                  <dd>{money(order.total, currency)}</dd>
                </div>
              </dl>
              {paymentText && <p className="ed-r-sub ed-cf-paid">{paymentText}</p>}
              <p className="ed-r-thanks">Thank you. Enjoy your meal.</p>
              <Barcode value={id} />
            </div>
          </aside>
        )}
      </div>

      <p className="ed-colophon">
        Colophon. Set in Ultra and Chivo. Menu, prices, times and this order come live from the
        Unipage Storefront API; the same shop is also available in the <Link to="/classic">classic style</Link>.
      </p>
    </div>
  );
}
