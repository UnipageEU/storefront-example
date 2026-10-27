import { money, allergensLabel } from '../format.js';
import { useProductDetail } from '../shared/useProductDetail.js';
import Modal from './Modal.jsx';
import OptionGroup from './OptionGroup.jsx';
import Stepper from './Stepper.jsx';
import Icon from './Icon.jsx';
import './ProductDialog.css';

/** The product with its option groups, notes and quantity. Rendered while `product` is set. */
export default function ProductDialog({ product, onClose }) {
  const {
    currency, p, detail, groups, loading, error, retry,
    selections, setGroup, showGroupError, showAllErrors,
    quantity, setQuantity, maxQty, notes, setNotes,
    valid, canAdd, unitPrice, addLabel, submit, bodyRef: body,
  } = useProductDetail(product, onClose);

  return (
    <Modal open={!!product} label={product?.name || 'Product'} size="fixed" onClose={onClose}>
      {p && (
        <>
          <button type="button" className="pd-close icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
          <div ref={body} className="pd-body">
            {p.image && (
              <div className="pd-media">
                <img src={p.image} alt={p.name} />
              </div>
            )}
            <div className="pd-content">
              <h2 className="pd-title">{p.name}</h2>
              <p className="pd-price tabular">{money(p.price, currency)}</p>
              {p.description && <p className="pd-desc">{p.description}</p>}
              {p.allergens?.length > 0 && (
                <p className="pd-allergens">
                  <Icon name="info" size={15} />
                  <span><strong>Allergens:</strong> {allergensLabel(p)}</span>
                </p>
              )}
              {(p.soldOut || p.available === false) && (
                <div className="banner banner-warning pd-banner">
                  <Icon name="alert" size={18} />
                  <div>{p.soldOut ? 'This item is sold out.' : 'This item is not available right now.'}</div>
                </div>
              )}

              {loading ? (
                <div className="pd-groups" aria-busy="true">
                  {[1, 2].map((i) => (
                    <div key={i}>
                      <div className="skel" style={{ height: 20, width: '40%', marginBottom: 12 }} />
                      <div className="skel" style={{ height: 48, marginBottom: 4 }} />
                      <div className="skel" style={{ height: 48 }} />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="banner banner-danger pd-banner" role="alert">
                  <Icon name="alert" size={18} />
                  <div>
                    <strong>Could not load the options</strong>
                    <span className="banner-text">{error.message}</span>
                    <div>
                      <button type="button" className="btn btn-secondary banner-action" onClick={retry}>Try again</button>
                    </div>
                  </div>
                </div>
              ) : (
                groups.length > 0 && (
                  <div className="pd-groups">
                    {groups.map((g) => (
                      <OptionGroup
                        key={g.id}
                        group={g}
                        value={selections[g.id]}
                        currency={currency}
                        showError={showGroupError(g.id)}
                        onChange={(v) => setGroup(g.id, v)}
                      />
                    ))}
                  </div>
                )
              )}

              <div className="field pd-notes">
                <label htmlFor="pd-notes">Special instructions <span className="muted">(optional)</span></label>
                <textarea id="pd-notes" className="textarea" maxLength={200} rows={2} placeholder="Anything the kitchen should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
          <footer className="pd-foot">
            <Stepper value={quantity} onChange={setQuantity} min={1} max={Math.max(1, maxQty)} label="quantity" />
            <button type="button" className={`btn btn-primary btn-lg pd-add${!valid && detail ? ' is-invalid' : ''}`} aria-disabled={!canAdd} onClick={submit}>
              <span>{addLabel}</span>
              <span className="tabular">{money(unitPrice * quantity, currency)}</span>
            </button>
          </footer>
          {showAllErrors && !valid && <p className="pd-foot-error" role="alert">Complete the required choices above.</p>}
        </>
      )}
    </Modal>
  );
}
