import { createStore } from '../store.js';

export const uiStore = createStore({ cartOpen: false, toast: null });

export const setCartOpen = (cartOpen) => uiStore.set({ cartOpen });

let toastTimer = null;
export function toast(message) {
  clearTimeout(toastTimer);
  uiStore.set({ toast: { message, id: Date.now() } });
  toastTimer = setTimeout(() => uiStore.set({ toast: null }), 2600);
}
