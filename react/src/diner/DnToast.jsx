import { useStore } from '../store.js';
import { uiStore } from '../state/ui.js';

/** The same toast as the other looks (state/ui.js), as a navy ticket. */
export default function DnToast() {
  const { toast } = useStore(uiStore);
  return (
    <div className="dn-toast-region" aria-live="polite" role="status">
      {toast && (
        <p key={toast.id} className="dn-toast">
          {toast.message}
        </p>
      )}
    </div>
  );
}
