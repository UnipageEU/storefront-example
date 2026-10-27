// Pickup or delivery, as two rounded buttons; the chosen one is filled navy.
import { useStore } from '../store.js';
import { shopStore, setOrderType, ORDER_TYPE_LABELS } from '../state/shop.js';

export default function OrderTypeButtons() {
  const shop = useStore(shopStore);
  const types = shop.store?.orderTypes?.length ? shop.store.orderTypes : ['TAKEOUT'];

  if (types.length < 2) {
    return <p className="dn-ot-single">{ORDER_TYPE_LABELS[types[0]] || types[0]} only</p>;
  }
  return (
    <div className="dn-ot" role="radiogroup" aria-label="How do you want to get your order?">
      {types.map((t) => (
        <button key={t} type="button" role="radio" className="dn-ot-btn" aria-checked={shop.orderType === t} onClick={() => setOrderType(t)}>
          {ORDER_TYPE_LABELS[t] || t}
        </button>
      ))}
    </div>
  );
}
