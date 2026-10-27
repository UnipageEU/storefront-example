// A dish with its choices, as an insert slipped into the menu card. Behaviour
// from shared/useProductDetail.js; option groups are the shared OptionGroup,
// restyled under `.dn`.
import { money, allergensLabel } from '../format.js';
import { useProductDetail } from '../shared/useProductDetail.js';
import Modal from '../components/Modal.jsx';
import OptionGroup from '../components/OptionGroup.jsx';
import Stepper from '../components/Stepper.jsx';
import Breakable from '../editorial/Breakable.jsx';

export default function DishSheet({ product, onClose }) {
  const {
    currency, p, detail, groups, loading, error, retry,
    selections, setGroup, showGroupError, showAllErrors,
    quantity, setQuantity, maxQty, notes, setNotes,
    valid, canAdd, unitPrice, addLabel, submit, bodyRef,
  } = useProductDetail(product, onClose);

  return (
    <Modal open={!!product} label={product?.name || 'Dish'} size="fixed" className="dn dn-modal" onClose={onClose}>
      {p && (
        <>
          <button type="button" className="dn-close dn-sheet-close" aria-label="Close" onClick={onClose}>
            Close
          </button>
          <div ref={bodyRef} className="dn-sheet-body">
            <h2 className="dn-sheet-title"><Breakable text={p.name} /></h2>
            <p className="dn-sheet-price">{money(p.price, currency)}</p>
            {p.description && <p className="dn-sheet-desc">{p.description}</p>}
            {p.allergens?.length > 0 && <p className="dn-sheet-allergens">Allergens: {allergensLabel(p)}</p>}
            {(p.soldOut || p.available === false) && (
              <p className="dn-alert">{p.soldOut ? 'This dish is sold out.' : 'This dish is not available right now.'}</p>
            )}

            {loading ? (
              <div className="dn-sheet-groups" aria-busy="true">
                {[1, 2].map((i) => (
                  <div key={i} className="dn-og-box">
                    <div className="skel" style={{ height: 20, width: '40%', marginBottom: 12 }} />
                    <div className="skel" style={{ height: 44, marginBottom: 8 }} />
                    <div className="skel" style={{ height: 44 }} />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="dn-alert" role="alert">
                <strong>Could not load the choices.</strong> {error.message}{' '}
                <button type="button" className="dn-textlink" onClick={retry}>Try again</button>
              </div>
            ) : (
              groups.length > 0 && (
                <div className="dn-sheet-groups">
                  {groups.map((g) => (
                    <div key={g.id} className="dn-og-box">
                      <OptionGroup
                        group={g}
                        value={selections[g.id]}
                        currency={currency}
                        showError={showGroupError(g.id)}
                        onChange={(v) => setGroup(g.id, v)}
                      />
                    </div>
                  ))}
                </div>
              )
            )}

            <div className="dn-field dn-sheet-notes">
              <label htmlFor="dn-pd-notes">A note for the kitchen <span>(optional)</span></label>
              <textarea id="dn-pd-notes" className="dn-input" maxLength={200} rows={2} placeholder="Anything the kitchen should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <footer className="dn-sheet-foot">
            <Stepper value={quantity} onChange={setQuantity} min={1} max={Math.max(1, maxQty)} label="quantity" />
            <button type="button" className={`dn-btn dn-sheet-add${!valid && detail ? ' is-invalid' : ''}`} aria-disabled={!canAdd} onClick={submit}>
              <span>{addLabel === 'Add to order' ? 'Add to the check' : addLabel}</span>
              <span>{money(unitPrice * quantity, currency)}</span>
            </button>
          </footer>
          {showAllErrors && !valid && <p className="dn-sheet-error" role="alert">Complete the required choices above.</p>}
        </>
      )}
    </Modal>
  );
}
