// Two backends, one error shape ({ error: { code, message, fields? } }):
// - Unipage's Storefront API (https://developer.unipage.be/storefront/api/) for master data and the quote,
//   called straight from the browser with the public key;
// - our own Node relay (../server/README.md, "Routes") under /api for placing and reading
//   orders, because those need the secret key.
// Every failure is thrown as an ApiError.

const API_URL = (import.meta.env.VITE_UNIPAGE_API_URL || '').replace(/\/+$/, '');
const PUBLIC_KEY = import.meta.env.VITE_UNIPAGE_PUBLIC_KEY || '';

export class ApiError extends Error {
  constructor(code, message, status = 0, fields = null, retryAfter = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
    /** seconds, for RATE_LIMITED */
    this.retryAfter = retryAfter;
  }
}

// Codes whose upstream message is written for a developer, not a shopper.
const SHOPPER_MESSAGES = {
  UNAUTHENTICATED: 'This shop is not set up correctly (API key not accepted). Please try again later.',
  FORBIDDEN: 'This shop is not set up correctly (this website may not use its API key). Please try again later.',
  UPSTREAM: 'The restaurant could not be reached. Please try again in a moment.',
};

function retryAfterSeconds(res) {
  const raw = res.headers.get('Retry-After');
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n)) return Math.max(1, Math.ceil(n));
  const at = Date.parse(raw);
  return Number.isFinite(at) ? Math.max(1, Math.ceil((at - Date.now()) / 1000)) : null;
}

async function request(url, { method = 'GET', body, signal, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError('NETWORK', 'We could not reach the shop. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = data?.error;
    const code = err?.code || (res.status === 429 ? 'RATE_LIMITED' : res.status >= 500 ? 'UPSTREAM' : 'UNKNOWN');
    const retryAfter = code === 'RATE_LIMITED' ? retryAfterSeconds(res) : null;
    let message = SHOPPER_MESSAGES[code] || err?.message || `Something went wrong (HTTP ${res.status}).`;
    if (code === 'RATE_LIMITED') {
      message = `It's busy right now. Please try again${retryAfter ? ` in ${retryAfter} seconds` : ' in a moment'}.`;
    }
    if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') {
      console.error(`[shop] Unipage refused the public key (${code}): ${err?.message || res.status}`);
    }
    throw new ApiError(code, message, res.status, err?.fields || null, retryAfter);
  }
  if (data === null) {
    throw new ApiError('UPSTREAM', 'The shop answered something we did not understand.', res.status);
  }
  return data;
}

function storefront(path, options = {}) {
  if (!API_URL || !PUBLIC_KEY) {
    return Promise.reject(
      new ApiError('CONFIG', 'This shop is not configured: set VITE_UNIPAGE_API_URL and VITE_UNIPAGE_PUBLIC_KEY (see .env.example).'),
    );
  }
  return request(`${API_URL}${path}`, { ...options, headers: { 'X-Unipage-Key': PUBLIC_KEY } });
}

const relay = (path, options) => request(`/api${path}`, options);

const qs = (params) =>
  '?' +
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

export const api = {
  store: () => storefront('/store'),
  menu: (orderType) => storefront(`/menu${qs({ orderType })}`),
  product: (id) => storefront(`/products/${encodeURIComponent(id)}`),
  /** products: the cart's product ids, so the slots respect their preparation time and advance-order rules */
  schedule: (orderType, days = 7, products = []) => storefront(`/schedule${qs({ orderType, days, products: products.join(',') })}`),
  quote: (body, signal) => storefront('/cart/quote', { method: 'POST', body, signal }),
  /** -> { orderId, order, next } */
  checkout: (body) => relay('/checkout', { method: 'POST', body }),
  /** -> Order (https://developer.unipage.be/storefront/api/) */
  order: (id) => relay(`/orders/${encodeURIComponent(id)}`),
};
