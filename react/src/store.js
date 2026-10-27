// A minimal external store: plain state objects that modules update with
// set(), and that components read with useStore(). The state modules in
// ./state are ordinary functions on top of it.
import { useSyncExternalStore } from 'react';

export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    /** Merge a patch (an object, or a function of the current state) into the state. */
    set(patch) {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
