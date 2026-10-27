import { Link } from 'react-router-dom';
import { useBase } from '../shared/shopStyle.js';
import { useCheckout } from '../shared/useCheckout.js';
import { money } from '../format.js';
import OrderTypeToggle from '../components/OrderTypeToggle.jsx';
import SlotPicker from '../components/SlotPicker.jsx';
import CartLine from '../components/CartLine.jsx';
import QuoteTotals from '../components/QuoteTotals.jsx';
import Icon from '../components/Icon.jsx';
import './CheckoutView.css';

function FieldError({ message, style }) {
  return message ? <p className="field-error" style={style}><Icon name="alert" size={14} /> {message}</p> : null;
}

export default function CheckoutView() {
  const base = useBase();
  const {
    cart, store, currency, acceptsOrders, isDelivery, zones, methods,
    errors, banner, submitting, submit,
    setCustomer, setAddressField, setNotes, setPaymentType,
    onPostcode, onZone, zoneLabel,
    couponDraft, onCouponDraft, applyCoupon, removeCoupon, couponResult, couponInvalid, couponBusy, quoteErrors,
    payment: PAYMENT, slotSummary, submitLabel,
  } = useCheckout({ base, formSelector: '.co-form' });

  if (!cart.lines.length) {
    return (
      <div className="co container">
        <div className="co-empty">
          <h1>Your bag is empty</h1>
          <p className="muted">Add a few things from the menu, then come back here to check out.</p>
          <Link to={base} className="btn btn-primary">Browse the menu</Link>
        </div>
      </div>
    );
  }

  const step = (n) => (isDelivery ? n + 1 : n);
  const input = (id, label, value, onChange, error, props = {}) => (
    <div className={`field ${props.className || ''}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" value={value} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} {...props.input} />
      {props.hint}
      <FieldError message={error} />
    </div>
  );

  return (
    <div className="co container">
      <h1 className="co-title">Checkout</h1>

      {!acceptsOrders && (
        <div className="banner banner-warning co-closed" role="status">
          <Icon name="clock" size={18} />
          <div><strong>We are not taking orders right now</strong><span className="banner-text">You can’t place an order at the moment.</span></div>
        </div>
      )}

      <form className="co-grid" noValidate onSubmit={submit}>
        <div className="co-form">
          <section className="co-card" aria-labelledby="co-how-t">
            <h2 id="co-how-t" className="co-h"><span className="co-step">1</span> How</h2>
            <OrderTypeToggle />
          </section>

          {isDelivery && (
            <section className="co-card" aria-labelledby="co-addr-t">
              <h2 id="co-addr-t" className="co-h"><span className="co-step">2</span> Delivery address</h2>
              <div className="co-fields">
                <div className="field span-2">
                  <label htmlFor="f-zone">Delivery area</label>
                  <select id="f-zone" className="select" value={cart.zoneId || ''} aria-invalid={!!errors['delivery.zoneId']} aria-describedby="f-zone-hint" onChange={(e) => onZone(e.target.value)}>
                    <option value="" disabled>Choose your area</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{zoneLabel(z)}</option>)}
                  </select>
                  <span id="f-zone-hint" className="field-hint">Typing your postcode below selects the area for you.</span>
                  <FieldError message={errors['delivery.zoneId']} />
                </div>
                {input('f-street', 'Street', cart.address.street, (v) => setAddressField('street', v), errors['delivery.street'], { className: 'span-street', input: { autoComplete: 'address-line1' } })}
                {input('f-number', 'Number', cart.address.number, (v) => setAddressField('number', v), errors['delivery.number'], { className: 'span-number', input: { autoComplete: 'address-line2' } })}
                {input('f-postcode', 'Postcode', cart.address.postcode, onPostcode, errors['delivery.postcode'], { input: { inputMode: 'numeric', autoComplete: 'postal-code' } })}
                {input('f-city', 'City', cart.address.city, (v) => setAddressField('city', v), errors['delivery.city'], { input: { autoComplete: 'address-level2' } })}
              </div>
            </section>
          )}

          <section id="co-when" className="co-card" aria-labelledby="co-when-t">
            <h2 id="co-when-t" className="co-h">
              <span className="co-step">{step(2)}</span> {isDelivery ? 'Delivery time' : 'Pickup time'}
            </h2>
            <SlotPicker error={errors.slotAt} />
          </section>

          <section className="co-card" aria-labelledby="co-you-t">
            <h2 id="co-you-t" className="co-h"><span className="co-step">{step(3)}</span> Your details</h2>
            <div className="co-fields">
              {input('f-first', 'First name', cart.customer.firstName, (v) => setCustomer('firstName', v), errors['customer.firstName'], { input: { autoComplete: 'given-name' } })}
              {input('f-last', 'Last name', cart.customer.lastName, (v) => setCustomer('lastName', v), errors['customer.lastName'], { input: { autoComplete: 'family-name' } })}
              {input('f-email', 'E-mail', cart.customer.email, (v) => setCustomer('email', v), errors['customer.email'], {
                input: { type: 'email', autoComplete: 'email', inputMode: 'email', 'aria-describedby': 'f-email-hint' },
                hint: <span id="f-email-hint" className="field-hint">We send your confirmation here.</span>,
              })}
              {input('f-phone', 'Phone', cart.customer.phone, (v) => setCustomer('phone', v), errors['customer.phone'], {
                input: { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '+32 470 12 34 56' },
              })}
              {store.notesEnabled && (
                <div className="field span-2">
                  <label htmlFor="f-notes">Order notes <span className="muted">(optional)</span></label>
                  <textarea
                    id="f-notes"
                    className="textarea"
                    rows={2}
                    maxLength={300}
                    placeholder={isDelivery ? 'e.g. ring twice, 2nd floor' : 'Anything we should know?'}
                    value={cart.notes}
                    aria-invalid={!!errors.notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <FieldError message={errors.notes} />
                </div>
              )}
            </div>
          </section>

          <section className="co-card" aria-labelledby="co-pay-t">
            <h2 id="co-pay-t" className="co-h"><span className="co-step">{step(4)}</span> Payment</h2>
            <div className="pay" role="radiogroup" aria-labelledby="co-pay-t">
              {methods.map((m) => (
                <label key={m} className={`pay-opt${cart.paymentType === m ? ' active' : ''}`}>
                  <input type="radio" name="payment" value={m} className="sr-only" checked={cart.paymentType === m} onChange={() => setPaymentType(m)} />
                  <span className="pay-icon"><Icon name={PAYMENT[m]?.icon || 'card'} size={20} /></span>
                  <span className="pay-text">
                    <strong>{PAYMENT[m]?.title || m}</strong>
                    <span className="muted">{PAYMENT[m]?.sub}</span>
                  </span>
                  <span className="pay-radio" aria-hidden="true" />
                </label>
              ))}
            </div>
            <FieldError message={errors.paymentType} style={{ marginTop: 8 }} />
          </section>
        </div>

        <aside className="co-summary" aria-label="Order summary">
          <div className="co-summary-card">
            <h2 className="co-h co-h-sum">Order summary</h2>
            {slotSummary && (
              <p className="co-when-sum">
                <Icon name="clock" size={16} />
                <span>{isDelivery ? 'Delivery' : 'Pickup'} {slotSummary}</span>
              </p>
            )}
            <ul className="co-lines">
              {cart.lines.map((line, i) => <CartLine key={line.key} line={line} index={i} compact />)}
            </ul>
            <Link to={base} className="co-edit">Edit order</Link>

            <div className="coupon">
              <label htmlFor="f-coupon" className="field-label">Discount code</label>
              {cart.coupon && couponResult?.valid ? (
                <div className="coupon-applied">
                  <span><Icon name="tag" size={16} /> <strong>{cart.coupon}</strong> applied</span>
                  <button type="button" className="btn btn-ghost" onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <div className="coupon-row">
                  <input
                    id="f-coupon"
                    className="input"
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder="Enter code"
                    value={couponDraft}
                    aria-invalid={couponInvalid || !!cart.couponError || !!errors.coupon}
                    onChange={(e) => onCouponDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyCoupon();
                      }
                    }}
                  />
                  <button type="button" className="btn btn-secondary" disabled={!couponDraft.trim() || couponBusy} onClick={applyCoupon}>
                    Apply
                  </button>
                </div>
              )}
              {couponInvalid ? (
                <div className="coupon-invalid">
                  <FieldError message={couponResult.message || 'This code is not valid.'} />
                  <button type="button" className="btn btn-ghost" onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <FieldError message={cart.couponError || errors.coupon} />
              )}
            </div>

            {cart.quote?.minimum?.missing > 0 && (
              <div className="banner banner-info">
                <Icon name="info" size={18} />
                <div>
                  Add <strong className="inline">{money(cart.quote.minimum.missing, currency)}</strong> more to reach the{' '}
                  {money(cart.quote.minimum.amount, currency)} minimum for delivery.
                </div>
              </div>
            )}
            {quoteErrors.length > 0 && (
              <ul className="co-qerrors">
                {quoteErrors.map((e, i) => <li key={i} className="field-error"><Icon name="info" size={14} /> {e}</li>)}
              </ul>
            )}
            {cart.quoteError && (
              <div className="banner banner-danger" role="alert">
                <Icon name="alert" size={18} />
                <div><strong>Could not calculate your total</strong><span className="banner-text">{cart.quoteError.message}</span></div>
              </div>
            )}

            <QuoteTotals large />

            {banner && (
              <div className="banner banner-danger" role="alert">
                <Icon name="alert" size={18} />
                <div>
                  <strong>{banner.title}</strong>
                  {banner.message && <span className="banner-text">{banner.message}</span>}
                  {banner.list?.length > 0 && (
                    <ul className="banner-list">{banner.list.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting || !acceptsOrders} aria-busy={submitting}>
              {submitting && <span className="spinner" aria-hidden="true" />}
              {submitLabel}
            </button>
            <p className="co-fine muted">Prices are confirmed by the restaurant when you place your order.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
