import { api } from '../api.js';
import { load, save } from '../storage.js';
import { createStore } from '../store.js';
import { shopStore } from './shop.js';

const KEY = 'sf-cart-v1';
const persisted = load(KEY, {}) || {};

export const cartStore = createStore({
  /** { key, productId, name, image, quantity, notes, unitPrice, options: [{ groupId, optionId, quantity, name, groupName, price }], optionsLabel } */
  lines: Array.isArray(persisted.lines) ? persisted.lines : [],
  coupon: persisted.coupon || '',
  zoneId: persisted.zoneId || null,
  /** { date, time, at } */
  slot: persisted.slot || null,
  notes: persisted.notes || '',
  customer: { firstName: '', lastName: '', email: '', phone: '', ...(persisted.customer || {}) },
  address: { street: '', number: '', postcode: '', city: '', ...(persisted.address || {}) },
  paymentType: persisted.paymentType || null,
  /** set when an order was submitted; the confirmation page clears the cart for it */
  pendingOrderId: persisted.pendingOrderId || null,

  quote: null,
  quoting: false,
  quoteError: null,
  /** why Unipage refused the last coupon (COUPON_INVALID), shown at the coupon field */
  couponError: null,
});

const PERSISTED = ['lines', 'coupon', 'zoneId', 'slot', 'notes', 'customer', 'address', 'paymentType', 'pendingOrderId'];
let lastSaved = null;
cartStore.subscribe(() => {
  const state = cartStore.get();
  const snapshot = JSON.stringify(PERSISTED.map((k) => state[k]));
  if (snapshot === lastSaved) return;
  lastSaved = snapshot;
  save(KEY, Object.fromEntries(PERSISTED.map((k) => [k, state[k]])));
});

export const setCart = (patch) => cartStore.set(patch);

/* ---------- derived values ---------- */

export const itemCount = (cart) => cart.lines.reduce((n, l) => n + l.quantity, 0);
export const localSubtotal = (cart) => cart.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
/** The quote total when we have one, else a local estimate (only used for the floating button). */
export const displayTotal = (cart) => (cart.quote && !cart.quoteError ? cart.quote.total : localSubtotal(cart));
export const quantityOfProduct = (cart, productId) =>
  cart.lines.filter((l) => l.productId === productId).reduce((n, l) => n + l.quantity, 0);

/* ---------- lines ---------- */

function sameOptions(a, b) {
  const key = (o) => o.map((x) => `${x.groupId}:${x.optionId}:${x.quantity}`).sort().join('|');
  return key(a) === key(b);
}

export function addLine(line) {
  const notes = (line.notes || '').trim();
  const { lines } = cartStore.get();
  const existing = lines.find((l) => l.productId === line.productId && (l.notes || '') === notes && sameOptions(l.options, line.options));
  if (existing) {
    setCart({ lines: lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + line.quantity } : l)) });
    return;
  }
  const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  setCart({ lines: [...lines, { key, ...line, notes }] });
}

export function setQuantity(key, quantity) {
  const { lines } = cartStore.get();
  setCart({ lines: quantity <= 0 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, quantity } : l)) });
}

export const removeLine = (key) => setQuantity(key, 0);

export function setLineNotes(key, notes) {
  setCart((cart) => ({ lines: cart.lines.map((l) => (l.key === key ? { ...l, notes: notes.trim() } : l)) }));
}

export function clearCart() {
  setCart({ lines: [], coupon: '', slot: null, notes: '', quote: null, quoteError: null, couponError: null });
}

export function linesPayload(lines = cartStore.get().lines) {
  return lines.map((l) => {
    const out = {
      productId: l.productId,
      quantity: l.quantity,
      options: l.options.map((o) => ({ groupId: o.groupId, optionId: o.optionId, quantity: o.quantity || 1 })),
    };
    if (l.notes) out.notes = l.notes;
    return out;
  });
}

/* ---------- quote: debounced, latest request wins ---------- */

let timer = null;
let retryTimer = null;
let controller = null;

export function requestQuote(delay = 350) {
  clearTimeout(timer);
  clearTimeout(retryTimer);
  if (!cartStore.get().lines.length) {
    controller?.abort();
    setCart({ quote: null, quoteError: null, quoting: false });
    return;
  }
  setCart({ quoting: true });
  timer = setTimeout(runQuote, delay);
}

async function runQuote() {
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const cart = cartStore.get();
  const { orderType } = shopStore.get();
  const body = { orderType, lines: linesPayload(cart.lines) };
  if (orderType === 'DELIVERY' && cart.zoneId) body.delivery = { zoneId: cart.zoneId };
  if (cart.coupon) body.coupon = cart.coupon;
  // The chosen slot: prices and availability follow the store's menu plan at that moment.
  if (cart.slot?.at) body.slotAt = cart.slot.at;

  try {
    const quote = await api.quote(body, signal);
    if (signal.aborted) return;
    setCart({ quote, quoteError: null });
  } catch (e) {
    if (e?.name === 'AbortError' || signal.aborted) return;
    if (e.code === 'COUPON_INVALID' && body.coupon) {
      // The quote normally reports a bad coupon inside a 200 (`coupon.valid`);
      // if Unipage refuses it outright, drop it so the rest still prices.
      setCart({ couponError: e.message, coupon: '' });
      return;
    }
    setCart({ quoteError: e });
    if (e.code === 'RATE_LIMITED') {
      retryTimer = setTimeout(() => requestQuote(0), (e.retryAfter || 5) * 1000);
    }
  } finally {
    if (!signal.aborted) setCart({ quoting: false });
  }
}

/** Re-quote whenever something that changes the price changes. */
export function startCartSync() {
  let last = null;
  const check = () => {
    const cart = cartStore.get();
    const signature = JSON.stringify([linesPayload(cart.lines), shopStore.get().orderType, cart.zoneId, cart.coupon, cart.slot?.at]);
    if (signature === last) return;
    last = signature;
    requestQuote();
  };
  cartStore.subscribe(check);
  shopStore.subscribe(check);
  check();
}
