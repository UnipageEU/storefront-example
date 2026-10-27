import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store.js';
import { shopStore, ORDER_TYPE_LABELS } from '../state/shop.js';
import { money, joinAddress } from '../format.js';
import { useBase } from '../shared/shopStyle.js';
import { useOrderStatus, ORDER_STEPS as STEPS, stepDescription } from '../shared/useOrderStatus.js';
import Icon from '../components/Icon.jsx';
import './ConfirmationView.css';

export default function ConfirmationView() {
  const { id } = useParams();
  const base = useBase();
  const shop = useStore(shopStore);
  const { order, error, isFinal, failed, pending, stepIndex, orderType, isDelivery, currency: cur, when, totals, paymentText, headline } = useOrderStatus(id);

  return (
    <div className="cf container">
      <header className="cf-head">
        <p className="cf-sub">
          Order <strong className="cf-id tabular">#{id}</strong>
        </p>
        <h1 className={`cf-title${failed ? ' failed' : ''}${pending ? ' pending' : ''}`}>{headline}</h1>
        {order?.customer?.email && <p className="cf-mail muted">Confirmation sent to {order.customer.email}</p>}
      </header>

      <div className="cf-grid">
        <div className="cf-main">
          <div className="cf-status" role="status" aria-live="polite">
            {order ? (
              <>
                <p className={`cf-label${failed ? ' failed' : ''}`}>{order.label}</p>
                {!isFinal && <p className="cf-live muted">Updating live</p>}
              </>
            ) : (
              !error && <div className="skel" style={{ height: 24, width: 200 }} />
            )}
          </div>

          {error && (!order || error.code === 'NOT_FOUND') && (
            <div className="banner banner-danger" role="alert">
              <Icon name="alert" size={18} />
              <div>
                <strong>{error.code === 'NOT_FOUND' ? 'We could not find this order' : 'Could not load the order status'}</strong>
                <span className="banner-text">{error.message}</span>
              </div>
            </div>
          )}

          {order && !failed && (
            <ol className="cf-steps" aria-label="Order progress">
              {STEPS.map((s, i) => {
                const done = i < stepIndex || (i === stepIndex && isFinal);
                return (
                  <li key={s.key} className={`cf-step${done ? ' done' : ''}${i === stepIndex && !isFinal ? ' current' : ''}`} aria-current={i === stepIndex ? 'step' : undefined}>
                    <span className="cf-step-mark tabular">{done ? <Icon name="check" size={16} stroke={2.6} /> : i + 1}</span>
                    <span className="cf-step-text">
                      <strong>{s.label}</strong>
                      <span className="muted">{stepDescription(s, isDelivery)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="cf-actions">
            <Link to={base} className="btn btn-secondary">Back to the menu</Link>
            {shop.store?.phone && (
              <a href={`tel:${shop.store.phone.replace(/\s+/g, '')}`} className="btn btn-ghost">
                <Icon name="phone" size={16} /> Call {shop.store.name}
              </a>
            )}
          </div>
        </div>

        {order && (
          <aside className="cf-receipt" aria-label="Your order">
            {orderType && <p className="cf-type">{ORDER_TYPE_LABELS[orderType] || orderType} order</p>}
            <dl className="cf-facts">
              {when && (
                <div>
                  <dt>{isDelivery ? 'Delivery' : 'Pickup'}</dt>
                  <dd>{when}</dd>
                </div>
              )}
              {isDelivery && order.delivery ? (
                <div>
                  <dt>Address</dt>
                  <dd>{order.delivery.street} {order.delivery.number}, {order.delivery.postcode} {order.delivery.city}</dd>
                </div>
              ) : (
                !isDelivery && shop.store?.address && (
                  <div>
                    <dt>Pick up at</dt>
                    <dd>{shop.store.name}, {joinAddress(shop.store.address)}</dd>
                  </div>
                )
              )}
              {paymentText && (
                <div>
                  <dt>Payment</dt>
                  <dd>{paymentText}</dd>
                </div>
              )}
            </dl>

            {order.lines?.length > 0 && (
              <>
                <ul className="cf-lines">
                  {order.lines.map((l, i) => (
                    <li key={i}>
                      <span className="tabular cf-q">{l.quantity}×</span>
                      <span className="cf-line-name">
                        {l.name}
                        {l.optionsLabel && <small className="muted">{l.optionsLabel}</small>}
                      </span>
                      <span className="tabular cf-line-total">{money(l.total, cur)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="cf-totals">
                  {totals.map((r) => (
                    <div key={r.label} className={r.discount ? 'discount' : undefined}>
                      <dt>{r.label}</dt>
                      <dd className="tabular">{r.free ? 'Free' : r.discount ? `−${money(-r.amount, cur)}` : money(r.amount, cur)}</dd>
                    </div>
                  ))}
                  <div className="total">
                    <dt>Total</dt>
                    <dd className="tabular">{money(order.total, cur)}</dd>
                  </div>
                </dl>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
