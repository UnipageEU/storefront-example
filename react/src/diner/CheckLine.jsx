// One line of the guest check. The quote's line (same index) supplies the real
// price and its errors, exactly like the classic CartLine.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.js';
import { cartStore, setQuantity, removeLine, setLineNotes, quantityOfProduct } from '../state/cart.js';
import { shopStore, currencyOf, productsById } from '../state/shop.js';
import { money } from '../format.js';
import Breakable from '../editorial/Breakable.jsx';

export default function CheckLine({ line, index, compact = false }) {
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
  const noteId = `dn-note-${line.key}`;

  useEffect(() => {
    if (editingNote) noteInput.current?.focus();
  }, [editingNote]);

  function saveNote(e) {
    e.preventDefault();
    setLineNotes(line.key, noteDraft);
    setEditingNote(false);
  }

  return (
    <li className={`dn-gc-line${errors.length ? ' has-error' : ''}`}>
      <p className="dn-gc-row">
        <span className="dn-gc-qty">{line.quantity}</span>
        <span className="dn-gc-name"><Breakable text={line.name} /></span>
        <span className="dn-gc-amount">{money(total, currency)}</span>
      </p>
      {optionsLabel && <p className="dn-gc-sub">{optionsLabel}</p>}
      {line.notes && !editingNote && <p className="dn-gc-sub dn-gc-note">Note: {line.notes}</p>}
      {errors.map((e, i) => (
        <p key={i} className="dn-gc-sub field-error">{e}</p>
      ))}
      {!compact && !editingNote && (
        <div className="dn-gc-actions">
          <span className="dn-gc-step" role="group" aria-label={`Quantity of ${line.name}`}>
            <button type="button" aria-label={line.quantity <= 1 ? `Remove ${line.name}` : `Decrease ${line.name}`} onClick={() => setQuantity(line.key, line.quantity - 1)}>
              −
            </button>
            <span aria-live="polite">{line.quantity}</span>
            <button type="button" aria-label={`Increase ${line.name}`} disabled={line.quantity >= max} onClick={() => setQuantity(line.key, line.quantity + 1)}>
              +
            </button>
          </span>
          <button type="button" className="dn-gc-link" onClick={() => { setNoteDraft(line.notes || ''); setEditingNote(true); }}>
            {line.notes ? 'Edit note' : 'Note'}
          </button>
          <button type="button" className="dn-gc-link" onClick={() => removeLine(line.key)}>
            Remove<span className="sr-only"> {line.name}</span>
          </button>
        </div>
      )}
      {editingNote && !compact && (
        <form className="dn-gc-noteform" onSubmit={saveNote}>
          <label htmlFor={noteId} className="sr-only">Note for {line.name}</label>
          <input
            id={noteId}
            ref={noteInput}
            className="dn-input"
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
          <button type="submit" className="dn-gc-link">Save</button>
        </form>
      )}
    </li>
  );
}
