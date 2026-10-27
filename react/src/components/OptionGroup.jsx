import { groupHint, groupError, atMax, selectedCount } from '../options.js';
import { money } from '../format.js';
import Stepper from './Stepper.jsx';
import Icon from './Icon.jsx';
import './OptionGroup.css';

/** One option group of a product. `value` is the selection { [optionId]: quantity }. */
export default function OptionGroup({ group, value = {}, onChange, showError = false, currency = 'EUR' }) {
  const uid = `g-${group.id}`;
  const error = groupError(group, value);
  const isSingle = group.type === 'RADIO' || group.type === 'SELECT';
  const optional = isSingle && group.required === false;
  const done = !error && selectedCount(group, value) > 0;
  const full = atMax(group, value);
  const singleValue = Object.keys(value).find((k) => value[k] > 0) || '';
  const priceLabel = (o) => (o.price > 0 ? `+${money(o.price, currency)}` : o.price < 0 ? money(o.price, currency) : '');

  const setSingle = (optionId) => onChange(optionId ? { [optionId]: 1 } : {});
  const setQuantity = (optionId, q) => {
    const next = { ...value };
    if (q > 0) next[optionId] = q;
    else delete next[optionId];
    onChange(next);
  };
  const amountMax = (o) => (group.max > 0 ? (value[o.id] || 0) + (group.max - selectedCount(group, value)) : 99);
  const unavailable = (o) => !o.available && <small> Unavailable</small>;

  return (
    <fieldset className={`og${showError && error ? ' og-error' : ''}`} aria-describedby={`${uid}-hint`} data-group={group.id}>
      <legend className="og-head">
        <span className="og-name">{group.name}</span>
        <span id={`${uid}-hint`} className={`og-hint${done ? ' ok' : ''}${showError && error ? ' bad' : ''}`}>
          {done && <Icon name="check" size={13} stroke={3} />}
          {showError && error ? error : groupHint(group)}
        </span>
      </legend>

      {group.type === 'SELECT' && (
        <div className="og-select">
          <label htmlFor={`${uid}-select`} className="sr-only">{group.name}</label>
          <select id={`${uid}-select`} className="select" value={singleValue} aria-invalid={showError && !!error} onChange={(e) => setSingle(e.target.value)}>
            <option value="" disabled={!optional}>{optional ? 'No thanks' : 'Choose…'}</option>
            {group.options.map((o) => (
              <option key={o.id} value={o.id} disabled={!o.available}>
                {o.name}{priceLabel(o) ? ` (${priceLabel(o)})` : ''}{o.available ? '' : ' (unavailable)'}
              </option>
            ))}
          </select>
        </div>
      )}

      {group.type === 'RADIO' && (
        <div className="og-list">
          {optional && (
            <label className="og-row">
              <input type="radio" name={uid} className="og-input" checked={!singleValue} onChange={() => setSingle('')} />
              <span className="og-mark og-mark-radio" />
              <span className="og-label">No thanks</span>
            </label>
          )}
          {group.options.map((o) => (
            <label key={o.id} className={`og-row${o.available ? '' : ' disabled'}`}>
              <input type="radio" name={uid} className="og-input" value={o.id} checked={singleValue === o.id} disabled={!o.available} onChange={() => setSingle(o.id)} />
              <span className="og-mark og-mark-radio" />
              <span className="og-label">{o.name}{unavailable(o)}</span>
              <span className="og-price tabular">{priceLabel(o)}</span>
            </label>
          ))}
        </div>
      )}

      {group.type === 'CHECKBOX' && (
        <div className="og-list">
          {group.options.map((o) => {
            const off = !o.available || (full && !value[o.id]);
            return (
              <label key={o.id} className={`og-row${off ? ' disabled' : ''}`}>
                <input type="checkbox" className="og-input" checked={!!value[o.id]} disabled={off} onChange={(e) => setQuantity(o.id, e.target.checked ? 1 : 0)} />
                <span className="og-mark og-mark-check"><Icon name="check" size={14} stroke={3} /></span>
                <span className="og-label">{o.name}{unavailable(o)}</span>
                <span className="og-price tabular">{priceLabel(o)}</span>
              </label>
            );
          })}
        </div>
      )}

      {group.type === 'AMOUNT' && (
        <div className="og-list">
          {group.options.map((o) => (
            <div key={o.id} className={`og-row og-row-amount${o.available ? '' : ' disabled'}`}>
              <span className="og-label">
                {o.name}{unavailable(o)}
                {priceLabel(o) && <span className="og-price-inline tabular">{priceLabel(o)} each</span>}
              </span>
              <Stepper value={value[o.id] || 0} min={0} max={o.available ? amountMax(o) : 0} size="sm" label={o.name} onChange={(q) => setQuantity(o.id, q)} />
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}
