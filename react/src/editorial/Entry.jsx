// One dish on the menu page: a numbered line with a dotted leader to the price.
// The editorial look shows no photographs: the type carries the page. The whole
// entry is the button that adds it (or opens its choices).
import { useStore } from '../store.js';
import { shopStore, currencyOf, acceptsOrdersOf } from '../state/shop.js';
import { cartStore, quantityOfProduct } from '../state/cart.js';
import { money, allergensLabel } from '../format.js';
import { pad } from './roman.js';
import Breakable from './Breakable.jsx';

export default function Entry({ product, number, onChoose }) {
  const shop = useStore(shopStore);
  const cart = useStore(cartStore);
  const currency = currencyOf(shop);
  const inCart = quantityOfProduct(cart, product.id);

  const unavailable = product.soldOut || product.available === false;
  const maxed = product.maxPerOrder && inCart >= product.maxPerOrder;
  const disabled = unavailable || !acceptsOrdersOf(shop) || maxed;
  const status = product.soldOut ? 'Sold out' : product.available === false ? 'Not available now' : maxed ? 'Maximum reached' : null;
  const label = [product.name, money(product.price, currency), status || (product.hasOptions ? 'choose options' : 'add to order')].join(', ');

  return (
    <li className={`ed-entry${unavailable ? ' is-off' : ''}${inCart ? ' in-cart' : ''}`}>
      <button type="button" className="ed-entry-hit" disabled={disabled} aria-label={label} onClick={() => onChoose(product)}>
        <span className="ed-entry-line">
          <span className="ed-entry-no">{pad(number)}</span>
          <span className="ed-entry-name"><Breakable text={product.name} /></span>
          <span className="ed-entry-leader" aria-hidden="true" />
          <span className="ed-entry-price">{money(product.price, currency)}</span>
        </span>
        {(product.description || product.hasOptions || status || inCart > 0 || product.allergens?.length > 0) && (
          <span className="ed-entry-meta">
            {product.description && <span className="ed-entry-desc">{product.description}</span>}
            <span className="ed-entry-tags">
              {status && <span className="ed-stamp">{status}</span>}
              {!status && inCart > 0 && <span className="ed-entry-incart">{inCart} on your receipt</span>}
              {product.hasOptions && <span>With choices</span>}
              {product.allergens?.length > 0 && <span>Contains {allergensLabel(product)}</span>}
            </span>
          </span>
        )}
      </button>
    </li>
  );
}
