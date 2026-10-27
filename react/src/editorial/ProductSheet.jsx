// A dish with its choices, as a magazine spread. Behaviour from
// shared/useProductDetail.js; option groups are the shared OptionGroup,
// restyled under `.ed`.
import { money, allergensLabel } from '../format.js';
import { useProductDetail } from '../shared/useProductDetail.js';
import Modal from '../components/Modal.jsx';
import OptionGroup from '../components/OptionGroup.jsx';
import Stepper from '../components/Stepper.jsx';
import Breakable from './Breakable.jsx';

export default function ProductSheet({ product, number, onClose }) {
  const {
    currency, p, detail, groups, loading, error, retry,
    selections, setGroup, showGroupError, showAllErrors,
    quantity, setQuantity, maxQty, notes, setNotes,
    valid, canAdd, unitPrice, addLabel, submit, bodyRef,
  } = useProductDetail(product, onClose);

  return (
    <Modal open={!!product} label={product?.name || 'Dish'} size="fixed" className="ed ed-modal" onClose={onClose}>
      {p && (
        <>
          <button type="button" className="ed-close ed-sheet-close" aria-label="Close" onClick={onClose}>
            Close
          </button>
          <div ref={bodyRef} className="ed-sheet-body">
            <div className="ed-sheet-content">
              <h2 className="ed-sheet-title"><Breakable text={p.name} /></h2>
              <p className="ed-sheet-price">
                {number && <span className="ed-sheet-no">N° {String(number).padStart(2, '0')}</span>}
                <span>{money(p.price, currency)}</span>
              </p>
              {p.description && <p className="ed-sheet-desc">{p.description}</p>}
              {p.allergens?.length > 0 && <p className="ed-sheet-allergens">Allergens: {allergensLabel(p)}</p>}
              {(p.soldOut || p.available === false) && (
                <p className="ed-r-alert">{p.soldOut ? 'This dish is sold out.' : 'This dish is not available right now.'}</p>
              )}

              {loading ? (
                <div className="ed-sheet-groups" aria-busy="true">
                  {[1, 2].map((i) => (
                    <div key={i}>
                      <div className="skel" style={{ height: 18, width: '40%', marginBottom: 12 }} />
                      <div className="skel" style={{ height: 44, marginBottom: 6 }} />
                      <div className="skel" style={{ height: 44 }} />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="ed-r-alert" role="alert">
                  <strong>Could not load the choices.</strong> {error.message}{' '}
                  <button type="button" className="ed-textlink" onClick={retry}>Try again</button>
                </div>
              ) : (
                groups.length > 0 && (
                  <div className="ed-sheet-groups">
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

              <div className="ed-field ed-sheet-notes">
                <label htmlFor="ed-pd-notes">A note for the kitchen <span>(optional)</span></label>
                <textarea id="ed-pd-notes" className="ed-input" maxLength={200} rows={2} placeholder="Anything the kitchen should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
          <footer className="ed-sheet-foot">
            <Stepper value={quantity} onChange={setQuantity} min={1} max={Math.max(1, maxQty)} label="quantity" />
            <button type="button" className={`ed-btn ed-sheet-add${!valid && detail ? ' is-invalid' : ''}`} aria-disabled={!canAdd} onClick={submit}>
              <span>{addLabel === 'Add to order' ? 'Add to receipt' : addLabel}</span>
              <span>{money(unitPrice * quantity, currency)}</span>
            </button>
          </footer>
          {showAllErrors && !valid && <p className="ed-sheet-error" role="alert">Complete the required choices above.</p>}
        </>
      )}
    </Modal>
  );
}
