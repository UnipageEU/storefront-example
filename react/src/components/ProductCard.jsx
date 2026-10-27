import { useStore } from '../store.js';
import { shopStore, currencyOf, acceptsOrdersOf } from '../state/shop.js';
import { cartStore, quantityOfProduct } from '../state/cart.js';
import { money, allergensLabel } from '../format.js';
import Icon from './Icon.jsx';
import './ProductCard.css';

export default function ProductCard({ product, onChoose }) {
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
    <article className={`pc${unavailable ? ' is-off' : ''}${inCart > 0 ? ' is-in' : ''}${product.image ? ' has-media' : ''}`}>
      <button type="button" className="pc-hit" disabled={disabled} aria-label={label} onClick={() => onChoose(product)} />
      {product.image && (
        <div className="pc-media">
          <img src={product.image} alt="" loading="lazy" width="96" height="96" />
        </div>
      )}
      <div className="pc-text">
        <h3 className="pc-name">{product.name}</h3>
        {product.description && <p className="pc-desc">{product.description}</p>}
        {product.allergens?.length > 0 && (
          <p className="pc-allergens">
            <Icon name="info" size={14} />
            <span>Contains {allergensLabel(product)}</span>
          </p>
        )}
        {(status || inCart > 0) && (
          <p className="pc-meta">
            {status ? <span className="pc-badge">{status}</span> : <span className="pc-badge pc-badge-accent tabular">{inCart} in bag</span>}
          </p>
        )}
      </div>
      <div className="pc-side">
        <span className="pc-price tabular">{money(product.price, currency)}</span>
        {!disabled && (
          <span className="pc-add" aria-hidden="true">
            <Icon name="plus" size={18} stroke={2.2} />
          </span>
        )}
      </div>
    </article>
  );
}
