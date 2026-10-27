// Order up: the order's live status on the left, its guest check on the
// right. Polling and statuses from shared/useOrderStatus.js.
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store.js';
import { shopStore, ORDER_TYPE_LABELS } from '../state/shop.js';
import { money, joinAddress } from '../format.js';
import { useBase } from '../shared/shopStyle.js';
import { useOrderStatus, ORDER_STEPS, stepDescription } from '../shared/useOrderStatus.js';
import { CheckHead, CheckColumns } from './GuestCheck.jsx';

export default function OrderPage() {
  const { id } = useParams();
  const base = useBase();
  const shop = useStore(shopStore);
  const { order, error, isFinal, failed, pending, stepIndex, orderType, isDelivery, currency, when, totals, paymentText, headline } = useOrderStatus(id);

  return (
    <div className="dn-wrap dn-cf">
      <div className="dn-cf-grid">
        <div className="dn-cf-main">
          <h1 className={`dn-cf-title${failed ? ' failed' : ''}`}>{headline}</h1>
          <p className="dn-cf-ref">Order {id}</p>

          <div className="dn-cf-status" role="status" aria-live="polite">
            {order ? (
              <>
                <p className="dn-cf-label">{order.label}</p>
                {!isFinal && <p className="dn-cf-live">Updating live</p>}
              </>
            ) : (
              !error && <div className="skel" style={{ height: 28, width: 220 }} />
            )}
          </div>

          {error && (!order || error.code === 'NOT_FOUND') && (
            <p className="dn-alert" role="alert">
              <strong>{error.code === 'NOT_FOUND' ? 'We could not find this order.' : 'Could not load the order status.'}</strong> {error.message}
            </p>
          )}

          {order && !failed && (
            <ol className="dn-steps" aria-label="Order progress">
              {ORDER_STEPS.map((s, i) => {
                const done = i < stepIndex || (i === stepIndex && isFinal);
                return (
                  <li key={s.key} className={`dn-step${done ? ' done' : ''}${i === stepIndex && !isFinal ? ' current' : ''}`} aria-current={i === stepIndex ? 'step' : undefined}>
                    <span className="dn-step-no">{i + 1}</span>
                    <span className="dn-step-text">
                      <strong>{s.label}{done && <span className="sr-only"> (done)</span>}</strong>
                      <span>{stepDescription(s, isDelivery)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {order && (
            <dl className="dn-facts dn-cf-facts">
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

          <div className="dn-cf-actions">
            <Link to={base} className="dn-btn">Back to the menu</Link>
            {shop.store?.phone && (
              <a href={`tel:${shop.store.phone.replace(/\s+/g, '')}`} className="dn-textlink">Call {shop.store.name}</a>
            )}
          </div>
        </div>

        {order?.lines?.length > 0 && (
          <aside className="dn-cf-aside" aria-labelledby="dn-cf-check-t">
            <div className="dn-gc dn-cf-check">
              <CheckHead
                id="dn-cf-check-t"
                number={id}
                cells={[
                  ['Order', orderType ? ORDER_TYPE_LABELS[orderType] || orderType : 'Order'],
                  ['Time', when || 'As soon as possible'],
                  ['Items', order.lines.reduce((n, l) => n + l.quantity, 0)],
                ]}
              />
              <CheckColumns />
              <ol className="dn-gc-lines">
                {order.lines.map((l, i) => (
                  <li key={i} className="dn-gc-line">
                    <p className="dn-gc-row">
                      <span className="dn-gc-qty">{l.quantity}</span>
                      <span className="dn-gc-name">{l.name}</span>
                      <span className="dn-gc-amount">{money(l.total, currency)}</span>
                    </p>
                    {l.optionsLabel && <p className="dn-gc-sub">{l.optionsLabel}</p>}
                  </li>
                ))}
              </ol>
              <div className="dn-gc-foot">
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
              {paymentText && <p className="dn-gc-sub dn-cf-paid">{paymentText}</p>}
              <p className="dn-gc-thanks">Thank you. Enjoy your meal.</p>
              </div>
            </div>
          </aside>
        )}
      </div>

    </div>
  );
}
