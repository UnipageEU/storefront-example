// "Pickup or Delivery", set as words rather than a toggle.
import { useStore } from '../store.js';
import { shopStore, setOrderType, ORDER_TYPE_LABELS } from '../state/shop.js';

export default function OrderTypeSwitch() {
  const shop = useStore(shopStore);
  const types = shop.store?.orderTypes?.length ? shop.store.orderTypes : ['TAKEOUT'];

  if (types.length < 2) {
    return <p className="ed-ots-single">{ORDER_TYPE_LABELS[types[0]] || types[0]} only</p>;
  }
  return (
    <div className="ed-ots" role="radiogroup" aria-label="How do you want to get your order?">
      {types.map((t, i) => (
        <span key={t} className="ed-ots-item">
          {i > 0 && <span className="ed-ots-or" aria-hidden="true">or</span>}
          <button type="button" role="radio" className="ed-ots-btn" aria-checked={shop.orderType === t} onClick={() => setOrderType(t)}>
            {ORDER_TYPE_LABELS[t] || t}
          </button>
        </span>
      ))}
    </div>
  );
}
