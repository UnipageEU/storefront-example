import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.js';
import { cartStore, setQuantity, removeLine, setLineNotes, quantityOfProduct } from '../state/cart.js';
import { shopStore, currencyOf, productsById } from '../state/shop.js';
import { money } from '../format.js';
import Stepper from './Stepper.jsx';
import Icon from './Icon.jsx';
import './CartLine.css';

/** One cart line; the quote's line (same index) supplies the real price and its errors. */
export default function CartLine({ line, index, compact = false }) {
  const cart = useStore(cartStore);
  const shop = useStore(shopStore);
  const currency = currencyOf(shop);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const noteInput = useRef(null);

  const q = cart.quote?.lines?.[index];
  const quoted = q && q.productId === line.productId ? q : null;
  const total = quoted?.total ?? line.unitPrice * line.quantity;
  const optionsLabel = quoted?.optionsLabel || line.optionsLabel;
  const errors = quoted?.errors || [];
  const maxPerOrder = productsById(shop).get(line.productId)?.maxPerOrder || null;
  const max = maxPerOrder ? maxPerOrder - (quantityOfProduct(cart, line.productId) - line.quantity) : 99;
  const noteId = `note-${line.key}`;

  useEffect(() => {
    if (editingNote) noteInput.current?.focus();
  }, [editingNote]);

  function editNote() {
    setNoteDraft(line.notes || '');
    setEditingNote(true);
  }

  function saveNote(e) {
    e.preventDefault();
    setLineNotes(line.key, noteDraft);
    setEditingNote(false);
  }

  return (
    <li className={`line${errors.length ? ' has-error' : ''}${compact ? ' compact' : ''}`}>
      <div className="line-main">
        <div className="line-text">
          <p className="line-name">
            {compact && <span className="line-qty tabular">{line.quantity}× </span>}
            {line.name}
          </p>
          {optionsLabel && <p className="line-options">{optionsLabel}</p>}
          {line.notes && !editingNote && (
            <p className="line-note">
              <Icon name="note" size={13} /> {line.notes}
            </p>
          )}
        </div>
        <span className="line-total tabular">{money(total, currency)}</span>
      </div>
      {errors.length > 0 && (
        <ul className="line-errors">
          {errors.map((e, i) => (
            <li key={i} className="field-error"><Icon name="alert" size={14} /> {e}</li>
          ))}
        </ul>
      )}
      {!compact && (
        <div className="line-actions">
          <Stepper value={line.quantity} onChange={(v) => setQuantity(line.key, v)} min={0} max={max} size="sm" removable label={line.name} />
          {!editingNote && (
            <button type="button" className="link-btn" onClick={editNote}>{line.notes ? 'Edit note' : 'Add note'}</button>
          )}
          <button type="button" className="link-btn link-danger" onClick={() => removeLine(line.key)}>
            Remove<span className="sr-only"> {line.name}</span>
          </button>
        </div>
      )}
      {editingNote && !compact && (
        <form className="line-note-edit" onSubmit={saveNote}>
          <label htmlFor={noteId} className="sr-only">Note for {line.name}</label>
          <input
            id={noteId}
            ref={noteInput}
            className="input"
            maxLength={200}
            placeholder="e.g. no onions"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setEditingNote(false);
              }
            }}
          />
          <button type="submit" className="btn btn-secondary">Save</button>
        </form>
      )}
    </li>
  );
}
