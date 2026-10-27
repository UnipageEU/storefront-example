// The checkout's behaviour, shared by both looks: delivery area and postcode,
// coupon, client-side validation, placing the order through the relay and
// turning Unipage's errors into field errors and a banner. The views only
// render it. Field ids (#co-when, #f-coupon) are part of the contract: the
// hook scrolls to and focuses them.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useStore } from '../store.js';
import { cartStore, setCart, linesPayload, requestQuote } from '../state/cart.js';
import { shopStore, currencyOf, timezoneOf, acceptsOrdersOf, loadMenu } from '../state/shop.js';
import { scheduleStore, loadSchedule } from '../state/schedule.js';
import { money, dateParts } from '../format.js';
import { save } from '../storage.js';

const KNOWN_FIELDS = new Set([
  'customer.firstName', 'customer.lastName', 'customer.email', 'customer.phone',
  'delivery.zoneId', 'delivery.street', 'delivery.number', 'delivery.postcode', 'delivery.city',
  'slotAt', 'paymentType', 'notes', 'coupon',
]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9][0-9 ()./-]{6,}$/;

/** Wait for a running quote so we judge `canCheckout` on fresh numbers. */
function quoteSettled() {
  if (!cartStore.get().quoting) return Promise.resolve();
  return new Promise((resolve) => {
    const stop = cartStore.subscribe(() => {
      if (!cartStore.get().quoting) {
        stop();
        resolve();
      }
    });
  });
}

function focusFirstError(formSelector) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`${formSelector} [aria-invalid="true"], ${formSelector} .field-error`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el && el.matches('input, select, textarea')) el.focus({ preventScroll: true });
  });
}

/**
 * @param base the look's path: the confirmation is `${base}/order/{id}`
 * @param formSelector the element holding the fields, for focusing the first error
 */
export function useCheckout({ base = '', formSelector = '.co-form' } = {}) {
  const cart = useStore(cartStore);
  const shop = useStore(shopStore);
  const navigate = useNavigate();
  const store = shop.store;
  const currency = currencyOf(shop);
  const acceptsOrders = acceptsOrdersOf(shop);
  const isDelivery = shop.orderType === 'DELIVERY';
  const zones = store?.delivery?.zones || [];
  const methods = store?.payment?.methods || ['online'];

  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null); // { title, message, list? }
  const [submitting, setSubmitting] = useState(false);
  const [couponDraft, setCouponDraft] = useState(cart.coupon || '');

  useEffect(() => {
    if (!cart.paymentType || !methods.includes(cart.paymentType)) {
      setCart({ paymentType: methods.includes(store?.payment?.default) ? store.payment.default : methods[0] });
    }
  }, [methods.join(',')]);

  useEffect(() => {
    if (cart.slot) clearError('slotAt');
  }, [cart.slot]);

  const clearError = (key) => setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
  const setCustomer = (field, value) => {
    setCart((c) => ({ customer: { ...c.customer, [field]: value } }));
    clearError(`customer.${field}`);
  };
  const setAddress = (field, value) => setCart((c) => ({ address: { ...c.address, [field]: value } }));
  const setAddressField = (field, value) => {
    setAddress(field, value);
    clearError(`delivery.${field}`);
  };
  const setNotes = (value) => {
    setCart({ notes: value });
    clearError('notes');
  };
  const setPaymentType = (m) => {
    setCart({ paymentType: m });
    clearError('paymentType');
  };

  /* ---------- delivery zone + postcode ---------- */
  const zone = zones.find((z) => z.id === cart.zoneId) || null;
  const zoneLabel = (z) => {
    const fee = z.cost > 0 ? money(z.cost, currency) : 'free';
    const free = z.cost > 0 && z.freeFrom > 0 ? `, free from ${money(z.freeFrom, currency)}` : '';
    return `${z.name}${String(z.name) !== String(z.postcode) ? ` (${z.postcode})` : ''}: delivery ${fee}${free}`;
  };
  function onPostcode(value) {
    setAddress('postcode', value);
    clearError('delivery.postcode');
    const match = zones.find((z) => String(z.postcode).trim() === value.trim());
    if (match) {
      setCart({ zoneId: match.id });
      clearError('delivery.zoneId');
    }
  }
  function onZone(id) {
    setCart({ zoneId: id });
    clearError('delivery.zoneId');
    const z = zones.find((x) => x.id === id);
    if (z && !cart.address.postcode.trim()) setAddress('postcode', String(z.postcode));
  }

  /* ---------- coupon ---------- */
  const couponResult = cart.quote?.coupon || null;
  function applyCoupon() {
    clearError('coupon');
    const code = couponDraft.trim().toUpperCase();
    setCart({ couponError: null, coupon: code });
    setCouponDraft(code);
  }
  function removeCoupon() {
    setCart({ couponError: null, coupon: '' });
    setCouponDraft('');
  }
  function onCouponDraft(value) {
    setCouponDraft(value);
    // Emptying the field takes the code off the order, valid or not.
    if (!value.trim() && (cart.coupon || cart.couponError)) setCart({ couponError: null, coupon: '' });
  }
  // The coupon field shows its own reason; keep it out of the general error lists.
  const couponInvalid = !!(cart.coupon && couponResult && !couponResult.valid);
  const quoteErrors = (cart.quote?.errors || []).filter((e) => !couponInvalid || e !== couponResult.message);
  const couponBusy = cart.quoting && cart.coupon === couponDraft.trim().toUpperCase();

  /* ---------- validation ---------- */
  function validate() {
    const e = {};
    const c = cart.customer;
    if (!c.firstName.trim()) e['customer.firstName'] = 'Enter your first name.';
    if (!c.lastName.trim()) e['customer.lastName'] = 'Enter your last name.';
    if (!c.email.trim()) e['customer.email'] = 'Enter your e-mail address.';
    else if (!EMAIL.test(c.email.trim())) e['customer.email'] = 'This e-mail address does not look right.';
    if (!c.phone.trim()) e['customer.phone'] = 'Enter your phone number.';
    else if (!PHONE.test(c.phone.trim())) e['customer.phone'] = 'This phone number does not look right.';
    if (isDelivery) {
      const a = cart.address;
      if (!cart.zoneId) e['delivery.zoneId'] = 'Choose your delivery area.';
      if (!a.street.trim()) e['delivery.street'] = 'Enter your street.';
      if (!a.number.trim()) e['delivery.number'] = 'Enter your house number.';
      if (!a.city.trim()) e['delivery.city'] = 'Enter your city.';
      if (!a.postcode.trim()) e['delivery.postcode'] = 'Enter your postcode.';
      else if (!zones.some((z) => String(z.postcode).trim() === a.postcode.trim())) e['delivery.postcode'] = 'Sorry, we do not deliver to this postcode.';
      else if (zone && String(zone.postcode).trim() !== a.postcode.trim()) e['delivery.postcode'] = 'This postcode is not in the delivery area you chose.';
    }
    if (!cart.slot) e.slotAt = isDelivery ? 'Choose a delivery time.' : 'Choose a pickup time.';
    if (!cart.paymentType) e.paymentType = 'Choose how you want to pay.';
    return e;
  }

  /* ---------- submit ---------- */
  async function submit(event) {
    event.preventDefault();
    setBanner(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      focusFirstError(formSelector);
      return;
    }
    await quoteSettled();
    const current = cartStore.get();
    if (current.quoteError) {
      setBanner({ title: 'We could not check your order', message: current.quoteError.message });
      return;
    }
    if (current.quote && !current.quote.canCheckout) {
      const couponMessage = current.coupon && current.quote.coupon && !current.quote.coupon.valid ? current.quote.coupon.message : null;
      setBanner({
        title: 'Your order cannot be placed yet',
        list: [
          ...(current.quote.errors || []).filter((x) => x !== couponMessage),
          ...current.quote.lines.flatMap((l) => l.errors.map((x) => `${l.name}: ${x}`)),
        ],
      });
      return;
    }

    const body = {
      orderType: shop.orderType,
      slotAt: current.slot.at,
      lines: linesPayload(current.lines),
      customer: {
        firstName: current.customer.firstName.trim(),
        lastName: current.customer.lastName.trim(),
        email: current.customer.email.trim(),
        phone: current.customer.phone.trim(),
      },
      paymentType: current.paymentType,
      notes: store?.notesEnabled && current.notes.trim() ? current.notes.trim() : null,
      coupon: current.coupon || null,
      // The UI language: Unipage writes the order label, mails and SMS in it.
      locale: 'en',
    };
    if (isDelivery) {
      const a = current.address;
      body.delivery = { zoneId: current.zoneId, street: a.street.trim(), number: a.number.trim(), postcode: a.postcode.trim(), city: a.city.trim() };
    }

    setSubmitting(true);
    try {
      const res = await api.checkout(body);
      // The confirmation page polls the order from Unipage; keep the order as
      // placed so it shows at once, before the first poll answers.
      save(`sf-order-${res.orderId}`, { order: res.order || null });
      setCart({ pendingOrderId: res.orderId });
      if (res.next?.type === 'payment' && res.next.url) {
        window.location.href = res.next.url;
        return; // keep the button busy while the browser leaves
      }
      navigate(`${base}/order/${res.orderId}`);
    } catch (err) {
      setSubmitting(false);
      handleCheckoutError(err);
    }
  }

  function handleCheckoutError(err) {
    const fields = err.fields || {};
    const known = {};
    const unknown = [];
    for (const [k, v] of Object.entries(fields)) {
      if (KNOWN_FIELDS.has(k)) known[k] = v;
      else unknown.push(v);
    }
    setErrors(known);
    switch (err.code) {
      case 'SLOT_UNAVAILABLE':
        setCart({ slot: null });
        setErrors({ ...known, slotAt: 'That time just filled up. Please pick another time.' });
        setBanner({ title: 'That time is no longer available', message: 'Please pick another time and place your order again.' });
        loadSchedule(shop.orderType, { keepLoaded: true });
        scheduleStore.set({ lostSlot: false });
        requestAnimationFrame(() => document.getElementById('co-when')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        return;
      case 'DELIVERY_UNAVAILABLE':
        if (!Object.keys(fields).length) setErrors({ 'delivery.zoneId': err.message });
        setBanner({ title: 'We cannot deliver this order', message: err.message });
        break;
      case 'PRODUCT_UNAVAILABLE':
        setBanner({ title: 'Something in your order is no longer available', message: err.message, list: unknown });
        loadMenu();
        requestQuote(0);
        break;
      case 'COUPON_INVALID':
        setCart({ couponError: err.message, coupon: '' });
        setBanner({ title: 'Your discount code cannot be used', message: 'We removed it from your order. Check the new total and place your order again.' });
        requestAnimationFrame(() => document.getElementById('f-coupon')?.focus());
        return;
      case 'MINIMUM_NOT_REACHED':
        setBanner({ title: 'Your order is below the minimum', message: err.message });
        requestQuote(0);
        return;
      case 'RATE_LIMITED':
        setBanner({ title: 'Too many attempts', message: err.message });
        return;
      case 'VALIDATION':
        setBanner({ title: 'Please check your details', message: Object.keys(fields).length ? null : err.message, list: unknown });
        break;
      case 'NETWORK':
        setBanner({ title: 'No connection', message: err.message });
        break;
      default:
        setBanner({ title: 'We could not place your order', message: err.message || 'Please try again in a moment.' });
    }
    focusFirstError(formSelector);
  }

  const payment = {
    online: { title: 'Pay online', sub: 'Card, Bancontact and more on the next step', icon: 'card' },
    offline: {
      title: isDelivery ? 'Pay on delivery' : 'Pay at pickup',
      sub: isDelivery ? 'Pay the driver when your order arrives' : 'Pay when you collect your order',
      icon: 'cash',
    },
  };
  const slotSummary = cart.slot ? `${dateParts(cart.slot.date, timezoneOf(shop)).long} at ${cart.slot.time}` : null;
  const submitLabel = submitting
    ? cart.paymentType === 'online' ? 'Going to payment…' : 'Placing your order…'
    : cart.paymentType === 'online' ? 'Continue to payment' : 'Place order';

  return {
    cart, shop, store, currency, acceptsOrders, isDelivery, zones, methods,
    errors, banner, submitting, submit, clearError,
    setCustomer, setAddressField, setNotes, setPaymentType,
    onPostcode, onZone, zoneLabel,
    couponDraft, onCouponDraft, applyCoupon, removeCoupon, couponResult, couponInvalid, couponBusy, quoteErrors,
    payment, slotSummary, submitLabel,
  };
}
