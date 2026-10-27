// The order relay: the only two calls that need the secret key. Everything
// else the SPA reads straight from the Storefront API with the public key.
//
// Each operation resolves to { status, body, headers } for the HTTP layer.
// Unipage's own errors ({ error: { code, ... } }) pass through with their
// status (and Retry-After); a network failure, a timeout or an answer that is
// not the documented shape becomes UPSTREAM 502.

import { ApiError } from './errors.js';

const ORDER_ID = /^[A-Za-z0-9]{1,32}$/;
// The locales the Storefront API accepts on an order (mails, SMS, the order label).
const LOCALES = new Set(['nl', 'fr', 'en', 'de', 'es']);

const upstream = (message) => new ApiError('UPSTREAM', message);

export function createRelay({ apiUrl, secretKey, publicUrl, timeoutMs = 15_000, customerNotifications = true }, { fetchImpl = globalThis.fetch, log = console } = {}) {
    async function call(path, { method = 'GET', body } = {}) {
        if (!secretKey) {
            log.error('[relay] UNIPAGE_SECRET_KEY is not set');
            throw upstream('Ordering is not configured on this server');
        }
        const headers = { Accept: 'application/json', Authorization: `Bearer ${secretKey}` };
        if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        let res;
        try {
            res = await fetchImpl(`${apiUrl}${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch (error) {
            log.error(`[relay] ${method} ${path} failed: ${error?.cause?.code || error?.name || error?.message}`);
            throw upstream('Unipage could not be reached');
        }

        const text = await res.text().catch(() => '');
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = null;
        }

        if (!res.ok) {
            if (data?.error?.code) {
                if (res.status === 401 || res.status === 403) {
                    log.error(`[relay] Unipage refused the secret key: ${data.error.code} ${data.error.message || ''}`);
                }
                const retryAfter = res.headers.get('retry-after');
                return { status: res.status, body: { error: data.error }, headers: retryAfter ? { 'Retry-After': retryAfter } : {} };
            }
            log.error(`[relay] ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
            throw upstream(`Unipage answered HTTP ${res.status}`);
        }
        if (data === null || typeof data !== 'object') {
            throw upstream('Unipage answered something that is not JSON');
        }
        return { status: res.status, data };
    }

    return {
        // POST /api/checkout -> POST /storefront/v1/orders.
        async checkout(body) {
            // The browser decides what is ordered, never how it is paid for:
            // with the secret key, "external" places an order as already paid.
            // A storefront with its own payment provider confirms the payment
            // on this server first and only then sends paymentType "external"
            // with a payment reference; this example takes no payments itself.
            if (body.paymentType === 'external') {
                throw new ApiError('VALIDATION', 'Unsupported payment type', { fields: { paymentType: 'Choose a payment method' } });
            }
            // The returnUrl and who mails the customer are this server's
            // choice, never the browser's; an unknown locale is dropped so
            // Unipage falls back to the store's language.
            const { locale, payment: _payment, customerNotifications: _notifications, ...rest } = body;
            const payload = { ...rest, returnUrl: `${publicUrl}/order/{orderId}` };
            if (!customerNotifications) payload.customerNotifications = false;
            if (LOCALES.has(locale)) payload.locale = locale;
            const result = await call('/orders', { method: 'POST', body: payload });
            if (!result.data) {
                return result;
            }
            const { order, next } = result.data;
            if (!order?.id || !next?.type) {
                throw upstream('Unipage placed the order but answered without an order or next step');
            }
            return { status: 201, body: { orderId: order.id, order, next } };
        },

        // GET /api/orders/:id -> GET /storefront/v1/orders/{id}
        async order(id) {
            if (!ORDER_ID.test(id)) {
                throw new ApiError('NOT_FOUND', 'Order not found');
            }
            const result = await call(`/orders/${encodeURIComponent(id)}`);
            if (!result.data) {
                return result;
            }
            if (!result.data.id || !result.data.status) {
                throw upstream('Unipage answered an order without id or status');
            }
            return { status: 200, body: result.data };
        },
    };
}
