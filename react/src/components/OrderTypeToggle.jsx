import { useStore } from '../store.js';
import { shopStore, setOrderType, ORDER_TYPE_LABELS } from '../state/shop.js';
import Icon from './Icon.jsx';
import './OrderTypeToggle.css';

const ICON = { TAKEOUT: 'store', DELIVERY: 'bike' };

export default function OrderTypeToggle() {
  const shop = useStore(shopStore);
  const types = shop.store?.orderTypes?.length ? shop.store.orderTypes : ['TAKEOUT'];

  if (types.length < 2) {
    return (
      <p className="ott-single">
        <Icon name={ICON[types[0]] || 'bag'} size={18} />
        {ORDER_TYPE_LABELS[types[0]] || types[0]} only
      </p>
    );
  }
  return (
    <div className="ott" role="radiogroup" aria-label="How do you want to get your order?">
      {types.map((t) => (
        <button key={t} type="button" role="radio" className="ott-btn" aria-checked={shop.orderType === t} onClick={() => setOrderType(t)}>
          <Icon name={ICON[t] || 'bag'} size={18} />
          {ORDER_TYPE_LABELS[t] || t}
        </button>
      ))}
    </div>
  );
}
