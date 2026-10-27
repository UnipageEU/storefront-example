// Accessible dialog: focus moves in on open, Tab is trapped, Escape and the
// backdrop close it, focus returns to the opener, the page stops scrolling.
// variant "center" = centered card (sheet from the bottom on phones),
// variant "drawer" = side panel on desktop, bottom sheet on phones.
// size "fixed" = the panel keeps one height from the first frame (the body
// scrolls inside it), so content that loads after opening never resizes it.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '../scrollLock.js';
import './Modal.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, label, variant = 'center', size = 'auto', className = '', onClose, children }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    lockScroll();
    const first = panel.current?.querySelector('[data-autofocus]') || panel.current;
    first?.focus({ preventScroll: true });
    return () => {
      unlockScroll();
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className={`modal-root modal-${variant}${size === 'fixed' ? ' modal-fixed' : ''}${className ? ` ${className}` : ''}`} onKeyDown={onKeyDown}>
      <div className="modal-backdrop" onClick={onClose} />
      <div ref={panel} className="modal-panel" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
