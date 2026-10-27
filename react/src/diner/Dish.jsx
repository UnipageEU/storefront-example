// One dish on the card: the name, a dotted leader and the price. The whole row
// is the button that adds it (or opens its choices).
import { useStore } from '../store.js';
import { shopStore, currencyOf, acceptsOrdersOf } from '../state/shop.js';
import { cartStore, quantityOfProduct } from '../state/cart.js';
import { money, allergensLabel } from '../format.js';
import Breakable from '../editorial/Breakable.jsx';

export default function Dish({ product, onChoose }) {
  const shop = useStore(shopStore);
  const cart = useStore(cartStore);
  const currency = currencyOf(shop);
  const inCart = quantityOfProduct(cart, product.id);

  const unavailable = product.soldOut || product.available === false;
  const maxed = product.maxPerOrder && inCart >= product.maxPerOrder;
  const disabled = unavailable || !acceptsOrdersOf(shop) || maxed;
  const status = product.soldOut ? 'Sold out' : product.available === false ? 'Not available now' : maxed ? 'Maximum reached' : null;
  const label = [product.name, money(product.price, currency), status || (product.hasOptions ? 'choose options' : 'add to order')].join(', ');
  const hasMeta = product.description || product.hasOptions || status || inCart > 0 || product.allergens?.length > 0;

  return (
    <li className={`dn-dish${unavailable ? ' is-off' : ''}${inCart ? ' in-cart' : ''}`}>
      <button type="button" className="dn-dish-hit" disabled={disabled} aria-label={label} onClick={() => onChoose(product)}>
        <span className="dn-dish-line">
          <span className="dn-dish-name"><Breakable text={product.name} /></span>
          <span className="dn-dish-leader" aria-hidden="true" />
          <span className="dn-dish-price">{money(product.price, currency)}</span>
        </span>
        {hasMeta && (
          <span className="dn-dish-meta">
            {product.description && <span className="dn-dish-desc">{product.description}</span>}
            <span className="dn-dish-tags">
              {status && <span className="dn-pill dn-pill-off">{status}</span>}
              {!status && inCart > 0 && <span className="dn-pill dn-pill-in">{inCart} on the check</span>}
              {product.hasOptions && <span>With choices</span>}
              {product.allergens?.length > 0 && <span>Contains {allergensLabel(product)}</span>}
            </span>
          </span>
        )}
      </button>
    </li>
  );
}
