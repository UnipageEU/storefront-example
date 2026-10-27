import { api } from '../api.js';
import { accentTokens, weekdayIn } from '../format.js';
import { load, save } from '../storage.js';
import { createStore } from '../store.js';

const ORDER_TYPE_KEY = 'sf-order-type';

export const shopStore = createStore({
  store: null,
  storeError: null,
  loadingStore: false,

  menu: null,
  menuError: null,
  loadingMenu: false,

  orderType: load(ORDER_TYPE_KEY, 'TAKEOUT'),
});

export const ORDER_TYPE_LABELS = { TAKEOUT: 'Pickup', DELIVERY: 'Delivery' };

function applyBranding(store) {
  const tokens = accentTokens(store?.branding?.primaryColor);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
  if (store?.name) document.title = `${store.name} | Order online`;
}

export async function loadStore() {
  shopStore.set({ loadingStore: true, storeError: null });
  try {
    const store = await api.store();
    applyBranding(store);
    const types = store.orderTypes?.length ? store.orderTypes : ['TAKEOUT'];
    const { orderType } = shopStore.get();
    shopStore.set({ store, orderType: types.includes(orderType) ? orderType : types[0] });
  } catch (e) {
    shopStore.set({ storeError: e });
    applyBranding(null);
  } finally {
    shopStore.set({ loadingStore: false });
  }
}

let menuRequest = 0;
export async function loadMenu() {
  const id = ++menuRequest;
  shopStore.set({ loadingMenu: true, menuError: null });
  try {
    const menu = await api.menu(shopStore.get().orderType);
    if (id === menuRequest) shopStore.set({ menu });
  } catch (e) {
    if (id === menuRequest) shopStore.set({ menuError: e });
  } finally {
    if (id === menuRequest) shopStore.set({ loadingMenu: false });
  }
}

export function setOrderType(type) {
  if (type === shopStore.get().orderType) return;
  shopStore.set({ orderType: type });
  save(ORDER_TYPE_KEY, type);
  loadMenu();
}

/* ---------- derived values: plain functions of the shop state ---------- */

export const currencyOf = (shop) => shop.store?.currency || 'EUR';
export const timezoneOf = (shop) => shop.store?.timezone || 'Europe/Brussels';
export const acceptsOrdersOf = (shop) => shop.store?.acceptsOrders !== false;

let productsCache = { menu: null, map: new Map() };
export function productsById(shop) {
  if (productsCache.menu !== shop.menu) {
    const map = new Map();
    for (const c of shop.menu?.categories || []) for (const p of c.products || []) map.set(p.id, p);
    productsCache = { menu: shop.menu, map };
  }
  return productsCache.map;
}

export function todayHours(shop) {
  const store = shop.store;
  if (!store?.openingHours?.length) return null;
  const day = store.openingHours.find((d) => d.day === weekdayIn(timezoneOf(shop)));
  if (!day) return null;
  if (!day.isOpen || !day.periods?.length) return { open: false, text: 'Closed today' };
  return { open: true, text: day.periods.map((p) => `${p.start} – ${p.end}`).join(', ') };
}
