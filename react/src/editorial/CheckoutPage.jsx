// The checkout as numbered sections next to the receipt. All behaviour comes
// from shared/useCheckout.js; the slot picker is the shared SlotPicker,
// restyled under `.ed`.
import { Link } from 'react-router-dom';
import { useBase } from '../shared/shopStyle.js';
import { useCheckout } from '../shared/useCheckout.js';
import SlotPicker from '../components/SlotPicker.jsx';
import QuoteTotals from '../components/QuoteTotals.jsx';
import { money } from '../format.js';
import OrderTypeSwitch from './OrderTypeSwitch.jsx';
import ReceiptLine from './ReceiptLine.jsx';
import Barcode from './Barcode.jsx';

function FieldError({ message }) {
  return message ? <p className="field-error">{message}</p> : null;
}

export default function CheckoutPage() {
  const base = useBase();
  const {
    cart, store, currency, acceptsOrders, isDelivery, zones, methods,
    errors, banner, submitting, submit,
    setCustomer, setAddressField, setNotes, setPaymentType,
    onPostcode, onZone, zoneLabel,
    couponDraft, onCouponDraft, applyCoupon, removeCoupon, couponResult, couponInvalid, couponBusy, quoteErrors,
    payment, slotSummary, submitLabel,
  } = useCheckout({ base, formSelector: '.ed-co-form' });

  if (!cart.lines.length) {
    return (
      <div className="ed-wrap ed-blank ed-blank-page">
        <h1>Your receipt is empty.</h1>
        <p>Add a few dishes from the menu, then come back here.</p>
        <Link to={base} className="ed-btn">Read the menu</Link>
      </div>
    );
  }

  const sections = isDelivery ? 5 : 4;
  let n = 0;
  const no = () => `${++n}`;
  const field = (id, label, value, onChange, error, props = {}) => (
    <div className={`ed-field ${props.className || ''}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="ed-input" value={value} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} {...props.input} />
      {props.hint}
      <FieldError message={error} />
    </div>
  );

  return (
    <div className="ed-wrap ed-co">
      <header className="ed-co-head">
        <h1 className="ed-co-title">Your order, nearly in the kitchen.</h1>
        <p className="ed-deck">{sections} short sections. The total on the right is the one you pay.</p>
      </header>

      {!acceptsOrders && (
        <p className="ed-r-alert" role="status">
          <strong>We are not taking orders right now.</strong> You can’t place an order at the moment.
        </p>
      )}

      <form className="ed-co-grid" noValidate onSubmit={submit}>
        <div className="ed-co-form">
          <section className="ed-sec" aria-labelledby="ed-how-t">
            <h2 id="ed-how-t" className="ed-sec-h"><span className="ed-sec-no">{no()}</span> How</h2>
            <OrderTypeSwitch />
          </section>

          {isDelivery && (
            <section className="ed-sec" aria-labelledby="ed-addr-t">
              <h2 id="ed-addr-t" className="ed-sec-h"><span className="ed-sec-no">{no()}</span> Where</h2>
              <div className="ed-fields">
                <div className="ed-field span-2">
                  <label htmlFor="f-zone">Delivery area</label>
                  <select id="f-zone" className="ed-input ed-select" value={cart.zoneId || ''} aria-invalid={!!errors['delivery.zoneId']} aria-describedby="f-zone-hint" onChange={(e) => onZone(e.target.value)}>
                    <option value="" disabled>Choose your area</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{zoneLabel(z)}</option>)}
                  </select>
                  <span id="f-zone-hint" className="ed-hint">Typing your postcode below selects the area for you.</span>
                  <FieldError message={errors['delivery.zoneId']} />
                </div>
                {field('f-street', 'Street', cart.address.street, (v) => setAddressField('street', v), errors['delivery.street'], { className: 'span-street', input: { autoComplete: 'address-line1' } })}
                {field('f-number', 'Number', cart.address.number, (v) => setAddressField('number', v), errors['delivery.number'], { className: 'span-number', input: { autoComplete: 'address-line2' } })}
                {field('f-postcode', 'Postcode', cart.address.postcode, onPostcode, errors['delivery.postcode'], { input: { inputMode: 'numeric', autoComplete: 'postal-code' } })}
                {field('f-city', 'City', cart.address.city, (v) => setAddressField('city', v), errors['delivery.city'], { input: { autoComplete: 'address-level2' } })}
              </div>
            </section>
          )}

          <section id="co-when" className="ed-sec" aria-labelledby="ed-when-t">
            <h2 id="ed-when-t" className="ed-sec-h"><span className="ed-sec-no">{no()}</span> When</h2>
            <SlotPicker error={errors.slotAt} />
          </section>

          <section className="ed-sec" aria-labelledby="ed-you-t">
            <h2 id="ed-you-t" className="ed-sec-h"><span className="ed-sec-no">{no()}</span> Who</h2>
            <div className="ed-fields">
              {field('f-first', 'First name', cart.customer.firstName, (v) => setCustomer('firstName', v), errors['customer.firstName'], { input: { autoComplete: 'given-name' } })}
              {field('f-last', 'Last name', cart.customer.lastName, (v) => setCustomer('lastName', v), errors['customer.lastName'], { input: { autoComplete: 'family-name' } })}
              {field('f-email', 'E-mail', cart.customer.email, (v) => setCustomer('email', v), errors['customer.email'], {
                input: { type: 'email', autoComplete: 'email', inputMode: 'email', 'aria-describedby': 'f-email-hint' },
                hint: <span id="f-email-hint" className="ed-hint">We send your confirmation here.</span>,
              })}
              {field('f-phone', 'Phone', cart.customer.phone, (v) => setCustomer('phone', v), errors['customer.phone'], {
                input: { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '+32 470 12 34 56' },
              })}
              {store.notesEnabled && (
                <div className="ed-field span-2">
                  <label htmlFor="f-notes">Order notes <span>(optional)</span></label>
                  <textarea
                    id="f-notes"
                    className="ed-input"
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

          <section className="ed-sec" aria-labelledby="ed-pay-t">
            <h2 id="ed-pay-t" className="ed-sec-h"><span className="ed-sec-no">{no()}</span> Payment</h2>
            <div className="ed-pay" role="radiogroup" aria-labelledby="ed-pay-t">
              {methods.map((m) => (
                <label key={m} className={`ed-pay-opt${cart.paymentType === m ? ' active' : ''}`}>
                  <input type="radio" name="payment" value={m} className="sr-only" checked={cart.paymentType === m} onChange={() => setPaymentType(m)} />
                  <span className="ed-pay-box" aria-hidden="true" />
                  <span className="ed-pay-text">
                    <strong>{payment[m]?.title || m}</strong>
                    <span>{payment[m]?.sub}</span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError message={errors.paymentType} />
          </section>
        </div>

        <aside className="ed-co-aside" aria-label="Order summary">
          <div className="ed-paper ed-co-paper">
            <header className="ed-r-head">
              <h2 className="ed-r-shop">{store.name}</h2>
              <p>Order summary</p>
              {slotSummary && <p>{isDelivery ? 'Delivery' : 'Pickup'} {slotSummary}</p>}
            </header>
            <ol className="ed-r-lines">
              {cart.lines.map((line, i) => <ReceiptLine key={line.key} line={line} index={i} compact />)}
            </ol>
            <Link to={base} className="ed-textlink ed-co-edit">Edit the order</Link>

            <div className="ed-coupon">
              <label htmlFor="f-coupon">Discount code</label>
              {cart.coupon && couponResult?.valid ? (
                <p className="ed-coupon-applied">
                  <span><strong>{cart.coupon}</strong> applied</span>
                  <button type="button" className="ed-textlink" onClick={removeCoupon}>Remove</button>
                </p>
              ) : (
                <div className="ed-coupon-row">
                  <input
                    id="f-coupon"
                    className="ed-input"
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder="Code"
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
                  <button type="button" className="ed-textlink" disabled={!couponDraft.trim() || couponBusy} onClick={applyCoupon}>Apply</button>
                </div>
              )}
              {couponInvalid ? (
                <p className="field-error">
                  {couponResult.message || 'This code is not valid.'}{' '}
                  <button type="button" className="ed-textlink" onClick={removeCoupon}>Remove</button>
                </p>
              ) : (
                <FieldError message={cart.couponError || errors.coupon} />
              )}
            </div>

            {cart.quote?.minimum?.missing > 0 && (
              <p className="ed-r-sub">
                Add {money(cart.quote.minimum.missing, currency)} more to reach the {money(cart.quote.minimum.amount, currency)} minimum for delivery.
              </p>
            )}
            {quoteErrors.length > 0 && (
              <ul className="ed-r-notes">
                {quoteErrors.map((e, i) => <li key={i} className="field-error">{e}</li>)}
              </ul>
            )}
            {cart.quoteError && (
              <p className="ed-r-alert" role="alert"><strong>Could not calculate your total.</strong> {cart.quoteError.message}</p>
            )}

            <QuoteTotals large />

            {banner && (
              <div className="ed-r-alert" role="alert">
                <strong>{banner.title}.</strong> {banner.message}
                {banner.list?.length > 0 && <ul>{banner.list.map((x, i) => <li key={i}>{x}</li>)}</ul>}
              </div>
            )}

            <button type="submit" className="ed-btn ed-btn-block" disabled={submitting || !acceptsOrders} aria-busy={submitting}>
              <span>{submitLabel}</span>
            </button>
            <p className="ed-r-sub ed-co-fine">Prices are confirmed by the restaurant when you place your order.</p>
            <Barcode value={store.id} />
          </div>
        </aside>
      </form>
    </div>
  );
}
