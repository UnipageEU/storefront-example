// The product dialog's behaviour, shared by both looks: load the product with
// its option groups, keep the selections, validate them with options.js and
// add the line to the cart. Each group renders with data-group={id}: the
// first invalid one is scrolled into view inside `bodyRef`.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useStore } from '../store.js';
import { cartStore, addLine, quantityOfProduct } from '../state/cart.js';
import { shopStore, currencyOf, acceptsOrdersOf } from '../state/shop.js';
import { toast } from '../state/ui.js';
import { groupError, optionsTotal, toCartOptions } from '../options.js';

export function useProductDetail(product, onClose) {
  const shop = useStore(shopStore);
  const cart = useStore(cartStore);
  const currency = currencyOf(shop);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selections, setSelections] = useState({});
  const [touched, setTouched] = useState({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const bodyRef = useRef(null);
  const current = useRef(null);

  async function fetchDetail(p) {
    current.current = p.id;
    setLoading(true);
    setError(null);
    try {
      const d = await api.product(p.id);
      if (current.current !== p.id) return;
      setDetail(d);
      setSelections(Object.fromEntries((d.optionGroups || []).map((g) => [g.id, {}])));
    } catch (e) {
      if (current.current === p.id) setError(e);
    } finally {
      if (current.current === p.id) setLoading(false);
    }
  }

  useEffect(() => {
    if (!product) return;
    setDetail(null);
    setError(null);
    setShowAllErrors(false);
    setQuantity(1);
    setNotes('');
    setSelections({});
    setTouched({});
    fetchDetail(product);
  }, [product]);

  const p = detail || product;
  const groups = detail?.optionGroups || [];
  const errors = Object.fromEntries(groups.map((g) => [g.id, groupError(g, selections[g.id])]));
  const valid = !!detail && Object.values(errors).every((e) => !e);
  const unitPrice = (p?.price || 0) + optionsTotal(groups, selections);
  const orderable = p && p.available !== false && !p.soldOut && acceptsOrdersOf(shop);
  const maxQty = p?.maxPerOrder ? Math.max(0, p.maxPerOrder - quantityOfProduct(cart, p.id)) : 99;
  const canAdd = valid && orderable && maxQty > 0;
  const addLabel = !orderable ? 'Not available' : maxQty <= 0 ? 'Maximum reached' : 'Add to order';

  function setGroup(groupId, value) {
    setSelections((s) => ({ ...s, [groupId]: value }));
    setTouched((t) => ({ ...t, [groupId]: true }));
  }

  const showGroupError = (groupId) => showAllErrors || !!touched[groupId];

  function submit() {
    if (!valid) {
      setShowAllErrors(true);
      const firstBad = groups.find((g) => errors[g.id]);
      requestAnimationFrame(() => bodyRef.current?.querySelector(`[data-group="${firstBad?.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    if (!canAdd) return;
    const { options, label } = toCartOptions(groups, selections);
    addLine({ productId: p.id, name: p.name, image: p.image || null, quantity, notes, unitPrice, options, optionsLabel: label });
    toast(`Added ${quantity > 1 ? `${quantity}× ` : ''}${p.name}`);
    onClose();
  }

  return {
    currency, p, detail, groups, loading, error, retry: () => fetchDetail(product),
    selections, setGroup, showGroupError, showAllErrors,
    quantity, setQuantity, maxQty, notes, setNotes,
    valid, orderable, canAdd, unitPrice, addLabel, submit, bodyRef,
  };
}

/** A product without options goes straight into the cart; one with options opens its dialog. */
export function chooseProduct(product, openDialog) {
  if (product.hasOptions) {
    openDialog(product);
    return;
  }
  addLine({ productId: product.id, name: product.name, image: product.image || null, quantity: 1, notes: '', unitPrice: product.price, options: [], optionsLabel: '' });
  toast(`Added ${product.name}`);
}
