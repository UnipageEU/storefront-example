// The confirmation page's behaviour, shared by both looks: clear the cart of
// the order just placed, poll the order through the relay until it reaches a
// final status, and derive what to show.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useStore } from '../store.js';
import { cartStore, clearCart, setCart } from '../state/cart.js';
import { shopStore, timezoneOf, currencyOf } from '../state/shop.js';
import { load } from '../storage.js';
import { dateParts, dateAt, timeAt } from '../format.js';

// Unipage order statuses. Anything else is shown by its label and polled on.
const FINAL = new Set(['CHEF_COMPLETED', 'DECLINED', 'CANCELED', 'CANCELLED', 'PAYMENT_FAILED', 'COMPLETED', 'DELIVERED']);
const FAILED = new Set(['DECLINED', 'CANCELED', 'CANCELLED', 'PAYMENT_FAILED']);
const PENDING = new Set(['PENDING_PAYMENT', 'PENDING_PLACEMENT']);
export const ORDER_STEPS = [
  { key: 'PLACED', label: 'Received', desc: 'The restaurant has your order.' },
  { key: 'CHEF_STARTED', label: 'Preparing', desc: 'The kitchen is working on it.' },
  { key: 'CHEF_COMPLETED', label: 'Ready', desc: '' },
];

/** The text under a step; "Ready" depends on pickup or delivery. */
export const stepDescription = (step, isDelivery) =>
  step.key === 'CHEF_COMPLETED' ? (isDelivery ? 'On its way to you.' : 'Ready for pickup.') : step.desc;

export function useOrderStatus(id) {
  const shop = useStore(shopStore);
  const timezone = timezoneOf(shop);
  // Written by the checkout: the order as placed, shown until the first poll answers.
  const [order, setOrder] = useState(() => load(`sf-order-${id}`, null)?.order || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cartStore.get().pendingOrderId === id) {
      clearCart();
      setCart({ pendingOrderId: null });
    }
    let alive = true;
    let timer = null;
    async function poll() {
      let latest = null;
      let failure = null;
      try {
        latest = await api.order(id);
        if (!alive) return;
        setOrder(latest);
        setError(null);
      } catch (e) {
        if (!alive) return;
        failure = e;
        setError(e);
        if (e.code === 'NOT_FOUND') return; // nothing to poll for
      }
      if (latest && FINAL.has(latest.status)) return;
      const wait = failure?.code === 'RATE_LIMITED' ? Math.max(5, failure.retryAfter || 0) * 1000 : 5000;
      timer = setTimeout(poll, wait);
    }
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);

  const status = order?.status || null;
  const isFinal = !!status && FINAL.has(status);
  const failed = !!status && FAILED.has(status);
  const pending = !!status && PENDING.has(status);
  let stepIndex = ORDER_STEPS.findIndex((s) => s.key === status);
  if (stepIndex < 0) stepIndex = status === 'COMPLETED' || status === 'DELIVERED' ? ORDER_STEPS.length - 1 : pending || !status ? -1 : 0;
  const orderType = order?.orderType || null;
  const isDelivery = orderType === 'DELIVERY';
  const currency = order?.currency || currencyOf(shop);
  const when = order?.slotAt ? `${dateParts(dateAt(order.slotAt, timezone), timezone).long} at ${timeAt(order.slotAt, timezone)}` : null;

  const totals = [];
  if (order) {
    totals.push({ label: 'Subtotal', amount: order.subtotal });
    if (isDelivery) totals.push({ label: 'Delivery', amount: order.deliveryCost, free: !order.deliveryCost });
    if (order.serviceCost > 0) totals.push({ label: 'Service fee', amount: order.serviceCost });
    if (order.couponDiscount > 0) totals.push({ label: 'Discount', amount: -order.couponDiscount, discount: true });
  }
  const paymentText = !order ? null : order.isPaid ? 'Paid online' : order.paymentType === 'offline' ? (isDelivery ? 'Pay on delivery' : 'Pay at pickup') : pending ? 'Waiting for payment' : 'Not paid';
  const headline = failed ? 'Your order did not go through' : pending ? 'Almost there' : order?.customer?.firstName ? `Thanks, ${order.customer.firstName}!` : 'Thank you for your order!';

  return { order, error, status, isFinal, failed, pending, stepIndex, orderType, isDelivery, currency, when, totals, paymentText, headline };
}
