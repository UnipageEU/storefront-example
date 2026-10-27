// Order webhooks from Unipage (https://developer.unipage.be/storefront/webhooks/): verify the
// signature, drop repeats, answer 200 at once, then react in onOrderEvent().

import { createHmac, timingSafeEqual } from 'node:crypto';

// A request older than this is refused: a captured request cannot be replayed.
export const MAX_AGE_SECONDS = 5 * 60;
const SEEN_LIMIT = 1000;

export function sign(secret, timestamp, rawBody) {
    return 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

/** Whether the headers prove the body came from Unipage, recently. */
export function verify(secret, headers, rawBody, now = Date.now()) {
    const timestamp = String(headers['x-unipage-timestamp'] || '');
    const signature = String(headers['x-unipage-signature'] || '');
    if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > MAX_AGE_SECONDS) {
        return false;
    }
    const expected = Buffer.from(sign(secret, timestamp, rawBody));
    const given = Buffer.from(signature);

    return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * YOUR CODE GOES HERE. Called once per event, after the 200 went out.
 * With `customerNotifications: false` on POST /orders, this is where your
 * storefront sends its own customer messages. The example only logs.
 */
export async function onOrderEvent(event, order, previousStatus) {
    const to = order.customer?.email || 'the customer';
    if (event === 'order.created' && (order.isPaid || order.paymentType !== 'online')) {
        console.log(`[webhook] would send the confirmation of order ${order.id} to ${to}`);
    } else if (event === 'order.paid') {
        console.log(`[webhook] would send the payment confirmation of order ${order.id} to ${to}`);
    } else if (event === 'order.status_changed' && order.status === 'CHEF_STARTED') {
        console.log(`[webhook] would tell ${to} that order ${order.id} is being prepared`);
    } else if (event === 'order.status_changed' && order.status === 'CHEF_COMPLETED') {
        console.log(`[webhook] would tell ${to} that order ${order.id} is ready`);
    } else {
        console.log(`[webhook] ${event} for order ${order.id}: ${previousStatus ? `${previousStatus} -> ` : ''}${order.status}`);
    }
}

/**
 * Handles one webhook request. Returns the status to answer; the work itself
 * runs after that (`deliver` is the hook, injectable for tests).
 */
export function createWebhookHandler({ secret, deliver = onOrderEvent }) {
    const seen = new Set();

    return function handleWebhook(headers, rawBody) {
        if (!secret) {
            console.warn('[webhook] UNIPAGE_WEBHOOK_SECRET is not set: refusing webhooks');
            return { status: 503 };
        }
        if (!verify(secret, headers, rawBody)) {
            return { status: 401 };
        }
        let payload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return { status: 400 };
        }
        // A retry carries the same id: handle each event once.
        if (seen.has(payload.id)) {
            return { status: 200, duplicate: true };
        }
        seen.add(payload.id);
        if (seen.size > SEEN_LIMIT) {
            seen.delete(seen.values().next().value);
        }
        const { order, previousStatus } = payload.data || {};
        setImmediate(() => {
            Promise.resolve(deliver(payload.event, order, previousStatus)).catch((error) => {
                console.error('[webhook] onOrderEvent failed', error);
            });
        });

        return { status: 200 };
    };
}
