// Selection rules per option group type, mirroring the table in the Storefront API reference (https://developer.unipage.be/storefront/api/)
// (Unipage enforces the same rules on quote and order). A selection is { [optionId]: quantity }.

const hasMax = (g) => g.max !== null && g.max !== undefined && g.max > 0;
const isSingle = (g) => g.type === 'RADIO' || g.type === 'SELECT';

export function selectedCount(group, sel = {}) {
  const values = Object.values(sel).filter((q) => q > 0);
  return group.type === 'AMOUNT' ? values.reduce((a, b) => a + b, 0) : values.length;
}

export function groupHint(group) {
  if (isSingle(group)) return group.required === false ? 'Optional, choose 1' : 'Required, choose 1';
  const min = group.min || 0;
  if (hasMax(group)) {
    if (min === group.max) return `Choose ${min}`;
    if (min > 0) return `Choose ${min} to ${group.max}`;
    return `Optional, up to ${group.max}`;
  }
  return min > 0 ? `Choose at least ${min}` : 'Optional';
}

export function groupError(group, sel = {}) {
  const n = selectedCount(group, sel);
  if (isSingle(group)) {
    if (n === 0 && group.required !== false) return 'Please choose one option.';
    if (n > 1) return 'Choose only one option.';
    return null;
  }
  const min = group.min || 0;
  if (n < min) return min === 1 ? 'Please choose at least 1.' : `Please choose at least ${min}.`;
  if (hasMax(group) && n > group.max) return `Choose at most ${group.max}.`;
  return null;
}

export function atMax(group, sel = {}) {
  if (isSingle(group)) return false;
  return hasMax(group) && selectedCount(group, sel) >= group.max;
}

export function optionsTotal(groups, selections) {
  let total = 0;
  for (const g of groups) {
    const sel = selections[g.id] || {};
    for (const o of g.options) if (sel[o.id] > 0) total += (o.price || 0) * sel[o.id];
  }
  return total;
}

/** CartLine options + a human label ("Sauce: Mayo, Toppings: 2x Feta"). */
export function toCartOptions(groups, selections) {
  const options = [];
  const parts = [];
  for (const g of groups) {
    const sel = selections[g.id] || {};
    const names = [];
    for (const o of g.options) {
      const q = sel[o.id] || 0;
      if (q <= 0) continue;
      options.push({ groupId: g.id, optionId: o.id, quantity: q, name: o.name, groupName: g.name, price: o.price || 0 });
      names.push(g.type === 'AMOUNT' && q > 1 ? `${q}x ${o.name}` : o.name);
    }
    if (names.length) parts.push(`${g.name}: ${names.join(', ')}`);
  }
  return { options, label: parts.join(', ') };
}
