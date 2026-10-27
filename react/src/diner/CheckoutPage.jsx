// The checkout as numbered sections next to the guest check. All behaviour
// comes from shared/useCheckout.js; the slot picker is the shared SlotPicker,
// restyled under `.dn`.
import { Link } from 'react-router-dom';
import { useBase } from '../shared/shopStyle.js';
import { useCheckout } from '../shared/useCheckout.js';
import SlotPicker from '../components/SlotPicker.jsx';
import QuoteTotals from '../components/QuoteTotals.jsx';
import { money } from '../format.js';
import OrderTypeButtons from './OrderTypeButtons.jsx';
import CheckLine from './CheckLine.jsx';
import { CheckHead, CheckColumns } from './GuestCheck.jsx';

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
  } = useCheckout({ base, formSelector: '.dn-co-form' });

  if (!cart.lines.length) {
    return (
      <div className="dn-wrap dn-blank dn-blank-page">
        <h1>Your check is empty.</h1>
        <p>Add a few dishes from the menu, then come back here.</p>
        <Link to={base} className="dn-btn">See the menu</Link>
      </div>
    );
  }

  const sections = isDelivery ? 5 : 4;
  let n = 0;
  const no = () => `${++n}`;
  const field = (id, label, value, onChange, error, props = {}) => (
    <div className={`dn-field ${props.className || ''}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="dn-input" value={value} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} {...props.input} />
      {props.hint}
      <FieldError message={error} />
    </div>
  );

  return (
    <div className="dn-wrap dn-co">
      <header className="dn-co-head">
        <h1 className="dn-co-title">Your order, nearly in the kitchen.</h1>
        <p className="dn-co-deck">{sections} short sections. The total on the check is the one you pay.</p>
      </header>

      {!acceptsOrders && (
        <p className="dn-alert" role="status">
          <strong>We are not taking orders right now.</strong> You can’t place an order at the moment.
        </p>
      )}

      <form className="dn-co-grid" noValidate onSubmit={submit}>
        <div className="dn-co-form">
          <section className="dn-sec" aria-labelledby="dn-how-t">
            <h2 id="dn-how-t" className="dn-sec-h"><span className="dn-sec-no">{no()}</span> How</h2>
            <OrderTypeButtons />
          </section>

          {isDelivery && (
            <section className="dn-sec" aria-labelledby="dn-addr-t">
              <h2 id="dn-addr-t" className="dn-sec-h"><span className="dn-sec-no">{no()}</span> Where</h2>
              <div className="dn-fields">
                <div className="dn-field span-2">
                  <label htmlFor="f-zone">Delivery area</label>
                  <select id="f-zone" className="dn-input dn-select" value={cart.zoneId || ''} aria-invalid={!!errors['delivery.zoneId']} aria-describedby="f-zone-hint" onChange={(e) => onZone(e.target.value)}>
                    <option value="" disabled>Choose your area</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{zoneLabel(z)}</option>)}
                  </select>
                  <span id="f-zone-hint" className="dn-hint">Typing your postcode below selects the area for you.</span>
                  <FieldError message={errors['delivery.zoneId']} />
                </div>
                {field('f-street', 'Street', cart.address.street, (v) => setAddressField('street', v), errors['delivery.street'], { className: 'span-street', input: { autoComplete: 'address-line1' } })}
                {field('f-number', 'Number', cart.address.number, (v) => setAddressField('number', v), errors['delivery.number'], { className: 'span-number', input: { autoComplete: 'address-line2' } })}
                {field('f-postcode', 'Postcode', cart.address.postcode, onPostcode, errors['delivery.postcode'], { input: { inputMode: 'numeric', autoComplete: 'postal-code' } })}
                {field('f-city', 'City', cart.address.city, (v) => setAddressField('city', v), errors['delivery.city'], { input: { autoComplete: 'address-level2' } })}
              </div>
            </section>
          )}

          <section id="co-when" className="dn-sec" aria-labelledby="dn-when-t">
            <h2 id="dn-when-t" className="dn-sec-h"><span className="dn-sec-no">{no()}</span> When</h2>
            <SlotPicker error={errors.slotAt} />
          </section>

          <section className="dn-sec" aria-labelledby="dn-you-t">
            <h2 id="dn-you-t" className="dn-sec-h"><span className="dn-sec-no">{no()}</span> Who</h2>
            <div className="dn-fields">
              {field('f-first', 'First name', cart.customer.firstName, (v) => setCustomer('firstName', v), errors['customer.firstName'], { input: { autoComplete: 'given-name' } })}
              {field('f-last', 'Last name', cart.customer.lastName, (v) => setCustomer('lastName', v), errors['customer.lastName'], { input: { autoComplete: 'family-name' } })}
              {field('f-email', 'E-mail', cart.customer.email, (v) => setCustomer('email', v), errors['customer.email'], {
                input: { type: 'email', autoComplete: 'email', inputMode: 'email', 'aria-describedby': 'f-email-hint' },
                hint: <span id="f-email-hint" className="dn-hint">We send your confirmation here.</span>,
              })}
              {field('f-phone', 'Phone', cart.customer.phone, (v) => setCustomer('phone', v), errors['customer.phone'], {
                input: { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '+32 470 12 34 56' },
              })}
              {store.notesEnabled && (
                <div className="dn-field span-2">
                  <label htmlFor="f-notes">Order notes <span>(optional)</span></label>
                  <textarea
                    id="f-notes"
                    className="dn-input"
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

          <section className="dn-sec" aria-labelledby="dn-pay-t">
            <h2 id="dn-pay-t" className="dn-sec-h"><span className="dn-sec-no">{no()}</span> Payment</h2>
            <div className="dn-pay" role="radiogroup" aria-labelledby="dn-pay-t">
              {methods.map((m) => (
                <label key={m} className={`dn-pay-opt${cart.paymentType === m ? ' active' : ''}`}>
                  <input type="radio" name="payment" value={m} className="sr-only" checked={cart.paymentType === m} onChange={() => setPaymentType(m)} />
                  <span className="dn-pay-box" aria-hidden="true" />
                  <span className="dn-pay-text">
                    <strong>{payment[m]?.title || m}</strong>
                    <span>{payment[m]?.sub}</span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError message={errors.paymentType} />
          </section>
        </div>

        <aside className="dn-co-aside" aria-labelledby="dn-co-check-t">
          <div className="dn-gc dn-co-check">
            <CheckHead
              id="dn-co-check-t"
              number={store.id}
              cells={[
                ['Order', isDelivery ? 'Delivery' : 'Pickup'],
                ['Time', slotSummary || 'Not chosen'],
                ['Items', cart.lines.reduce((n, l) => n + l.quantity, 0)],
              ]}
            />
            <CheckColumns />
            <ol className="dn-gc-lines">
              {cart.lines.map((line, i) => <CheckLine key={line.key} line={line} index={i} compact />)}
            </ol>
            <div className="dn-gc-foot">
            <Link to={base} className="dn-textlink dn-co-edit">Edit the order</Link>

            <div className="dn-coupon">
              <label htmlFor="f-coupon">Discount code</label>
              {cart.coupon && couponResult?.valid ? (
                <p className="dn-coupon-applied">
                  <span><strong>{cart.coupon}</strong> applied</span>
                  <button type="button" className="dn-textlink" onClick={removeCoupon}>Remove</button>
                </p>
              ) : (
                <div className="dn-coupon-row">
                  <input
                    id="f-coupon"
                    className="dn-input"
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
                  <button type="button" className="dn-textlink" disabled={!couponDraft.trim() || couponBusy} onClick={applyCoupon}>Apply</button>
                </div>
              )}
              {couponInvalid ? (
                <p className="field-error">
                  {couponResult.message || 'This code is not valid.'}{' '}
                  <button type="button" className="dn-textlink" onClick={removeCoupon}>Remove</button>
                </p>
              ) : (
                <FieldError message={cart.couponError || errors.coupon} />
              )}
            </div>

            {cart.quote?.minimum?.missing > 0 && (
              <p className="dn-gc-sub">
                Add {money(cart.quote.minimum.missing, currency)} more to reach the {money(cart.quote.minimum.amount, currency)} minimum for delivery.
              </p>
            )}
            {quoteErrors.length > 0 && (
              <ul className="dn-gc-notes">
                {quoteErrors.map((e, i) => <li key={i} className="field-error">{e}</li>)}
              </ul>
            )}
            {cart.quoteError && (
              <p className="dn-alert" role="alert"><strong>Could not calculate your total.</strong> {cart.quoteError.message}</p>
            )}

            <QuoteTotals large />

            {banner && (
              <div className="dn-alert" role="alert">
                <strong>{banner.title}.</strong> {banner.message}
                {banner.list?.length > 0 && <ul>{banner.list.map((x, i) => <li key={i}>{x}</li>)}</ul>}
              </div>
            )}

            <button type="submit" className="dn-btn dn-btn-block" disabled={submitting || !acceptsOrders} aria-busy={submitting}>
              <span>{submitLabel}</span>
            </button>
            <p className="dn-gc-sub dn-co-fine">Prices are confirmed by the restaurant when you place your order.</p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
