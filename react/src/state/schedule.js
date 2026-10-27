import { api } from '../api.js';
import { createStore } from '../store.js';
import { cartStore, setCart } from './cart.js';

export const scheduleStore = createStore({
  orderType: null,
  days: [],
  loading: false,
  error: null,
  /** set when a previously chosen time disappeared after a refresh */
  lostSlot: false,
});

let req = 0;

/** The cart's distinct product ids, sorted: the schedule only changes when this set does. */
export function cartProductIds(lines = cartStore.get().lines) {
  return [...new Set(lines.map((l) => l.productId))].sort();
}

export async function loadSchedule(orderType, { keepLoaded = false } = {}) {
  const id = ++req;
  const keep = keepLoaded && scheduleStore.get().orderType === orderType;
  scheduleStore.set((s) => ({ loading: true, error: null, days: keep ? s.days : [] }));
  try {
    const data = await api.schedule(orderType, 7, cartProductIds());
    if (id !== req) return;
    scheduleStore.set({ orderType, days: data.days || [] });
    reconcileSelection();
  } catch (e) {
    if (id === req) scheduleStore.set({ error: e });
  } finally {
    if (id === req) scheduleStore.set({ loading: false });
  }
}

/** Keep the chosen slot when it still exists and has room; otherwise drop it. */
function reconcileSelection() {
  const { slot } = cartStore.get();
  if (!slot) return;
  const day = scheduleStore.get().days.find((d) => d.date === slot.date);
  const still = day?.slots?.find((s) => s.at === slot.at);
  if (!still || !still.available) {
    setCart({ slot: null });
    scheduleStore.set({ lostSlot: true });
  }
}
