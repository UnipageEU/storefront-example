import { useStore } from '../store.js';
import { uiStore } from '../state/ui.js';
import Icon from './Icon.jsx';
import './Toast.css';

export default function Toast() {
  const { toast } = useStore(uiStore);
  return (
    <div className="toast-region" aria-live="polite" role="status">
      {toast && (
        <div key={toast.id} className="toast">
          <Icon name="check" size={18} stroke={2.4} />
          {toast.message}
        </div>
      )}
    </div>
  );
}
