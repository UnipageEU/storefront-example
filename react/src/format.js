// Formatting + small helpers. Everything time related uses the STORE timezone,
// never the browser's.

const moneyFormatters = new Map();

export function money(amount, currency = 'EUR') {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '';
  let f = moneyFormatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('en-IE', { style: 'currency', currency });
    moneyFormatters.set(currency, f);
  }
  return f.format(Number(amount));
}

/** YYYY-MM-DD for "now" in the given timezone. */
export function todayIn(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** MON..SUN for "now" in the given timezone. */
export function weekdayIn(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date()).slice(0, 3).toUpperCase();
  } catch {
    return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()];
  }
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Pieces of a store-local YYYY-MM-DD date for display (the date is already local, format it as UTC). */
export function dateParts(dateStr, timeZone) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const today = todayIn(timeZone);
  const fmt = (opts) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(d);
  let relative = null;
  if (dateStr === today) relative = 'Today';
  else if (dateStr === addDays(today, 1)) relative = 'Tomorrow';
  return {
    relative,
    weekday: fmt({ weekday: 'short' }),
    day: fmt({ day: 'numeric' }),
    month: fmt({ month: 'short' }),
    long: relative ? `${relative}, ${fmt({ day: 'numeric', month: 'long' })}` : fmt({ weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

/** HH:MM for a UTC unix timestamp, in the store timezone. */
export function timeAt(at, timeZone) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(at * 1000));
}

/** YYYY-MM-DD for a UTC unix timestamp, in the store timezone. */
export function dateAt(at, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at * 1000));
}

/**
 * "gluten (wheat, spelt), nuts (almonds)": the allergens with their named
 * sources (allergenSources), as EU food-information rules ask for gluten
 * cereals and nut species.
 */
export function allergensLabel(product) {
  const sources = product?.allergenSources || {};
  const label = (key) => key.replace(/_/g, ' ');
  return (product?.allergens || [])
    .map((a) => (sources[a]?.length ? `${label(a)} (${sources[a].map(label).join(', ')})` : label(a)))
    .join(', ');
}

export function joinAddress(a) {
  if (!a) return '';
  return [a.line1, [a.postcode, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

/* ---------- colour ---------- */

function parseHex(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const WHITE = [255, 255, 255];
const INK = [24, 22, 20];
const FALLBACK = [217, 72, 15]; // warm paprika orange

/**
 * Derive the accent tokens from the merchant's brand colour: the fill, the text
 * that stays readable on it, a darker variant readable as text on white, a
 * hover shade and a soft tint.
 */
export function accentTokens(hex) {
  let base = parseHex(hex) || FALLBACK;
  // Near-white brand colours make an unusable accent: fall back.
  if (contrast(base, WHITE) < 1.4) base = FALLBACK;

  const onAccent = contrast(base, WHITE) >= 3 ? WHITE : INK;

  let ink = base;
  for (let i = 0; i < 20 && contrast(ink, WHITE) < 4.5; i++) ink = mix(ink, [0, 0, 0], 0.08);

  return {
    '--accent': toHex(base),
    '--accent-contrast': toHex(onAccent),
    '--accent-ink': toHex(ink),
    '--accent-hover': toHex(mix(base, [0, 0, 0], 0.12)),
    '--accent-soft': toHex(mix(base, WHITE, 0.9)),
    '--accent-softer': toHex(mix(base, WHITE, 0.95)),
    '--accent-ring': `rgba(${base.map(Math.round).join(',')}, 0.35)`,
  };
}
