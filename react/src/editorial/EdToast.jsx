import { useStore } from '../store.js';
import { uiStore } from '../state/ui.js';

/** The same toast as the classic look (state/ui.js), set as a printed slip. */
export default function EdToast() {
  const { toast } = useStore(uiStore);
  return (
    <div className="ed-toast-region" aria-live="polite" role="status">
      {toast && (
        <p key={toast.id} className="ed-toast">
          {toast.message}
        </p>
      )}
    </div>
  );
}
