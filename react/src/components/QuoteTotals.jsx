import { useStore } from '../store.js';
import { cartStore } from '../state/cart.js';
import { shopStore, currencyOf } from '../state/shop.js';
import { money } from '../format.js';
import './QuoteTotals.css';

/** The quote's amounts: subtotal, delivery, charges, service fee, discount, total. */
export default function QuoteTotals({ large = false }) {
  const cart = useStore(cartStore);
  const shop = useStore(shopStore);
  const currency = currencyOf(shop);
  const q = cart.quote;
  const row = (key, label, value, className = '') => (
    <div key={key} className={`row ${className}`.trim()}>
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );

  return (
    <dl className={`totals${cart.quoting ? ' is-stale' : ''}${large ? ' large' : ''}`} aria-live="polite">
      {q ? (
        <>
          {row('subtotal', 'Subtotal', money(q.subtotal, currency))}
          {shop.orderType === 'DELIVERY' &&
            row('delivery', 'Delivery', !cart.zoneId ? 'Choose your area' : q.deliveryCost === 0 ? 'Free' : money(q.deliveryCost, currency))}
          {(q.charges || []).map((charge, i) => row(`charge-${i}`, charge.name, money(charge.amount, currency)))}
          {q.serviceCost > 0 && row('service', 'Service fee', money(q.serviceCost, currency))}
          {q.couponDiscount > 0 &&
            row('discount', <>Discount{q.coupon?.code && <span> ({q.coupon.code})</span>}</>, `−${money(q.couponDiscount, currency)}`, 'discount')}
          {row('total', 'Total', money(q.total, currency), 'total')}
        </>
      ) : (
        [1, 2, 3].map((i) =>
          row(i, <span className="skel" style={{ display: 'block', width: 90, height: 14 }} />, <span className="skel" style={{ display: 'block', width: 60, height: 14 }} />),
        )
      )}
    </dl>
  );
}
