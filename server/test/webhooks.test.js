import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/index.js';
import { createWebhookHandler, sign } from '../src/webhooks.js';

const SECRET = 'whsec_example_fake';
const nowSeconds = () => Math.floor(Date.now() / 1000);

function event(id = 'evt-1', type = 'order.status_changed') {
    return JSON.stringify({
        id,
        event: type,
        created_at: '2026-10-28T12:00:00+00:00',
        business_id: 'k3x9p',
        data: { order: { id: 'q4m8z', status: 'CHEF_STARTED', customer: { email: 'ann@example.com' } }, previousStatus: 'PLACED' },
    });
}

function headers(body, { timestamp = nowSeconds(), secret = SECRET } = {}) {
    return {
        'content-type': 'application/json',
        'x-unipage-event': 'order.status_changed',
        'x-unipage-timestamp': String(timestamp),
        'x-unipage-signature': sign(secret, timestamp, body),
    };
}

// The relay over HTTP, with a recording onOrderEvent.
async function serve(secret = SECRET) {
    const delivered = [];
    const webhooks = createWebhookHandler({ secret, deliver: (...args) => delivered.push(args) });
    const server = http.createServer(createApp({}, { staticDir: '/nonexistent', webhooks }));
    await new Promise((resolve) => server.listen(0, resolve));
    const url = `http://127.0.0.1:${server.address().port}/webhooks/unipage`;
    const post = (body, h) => fetch(url, { method: 'POST', headers: h, body });
    const settle = () => new Promise((resolve) => setImmediate(resolve));

    return { delivered, post, settle, close: () => new Promise((resolve) => server.close(resolve)) };
}

test('a correctly signed event is accepted and handed to onOrderEvent', async () => {
    const app = await serve();
    const body = event();
    const res = await app.post(body, headers(body));
    await app.settle();
    await app.close();

    assert.equal(res.status, 200);
    assert.equal(app.delivered.length, 1);
    assert.equal(app.delivered[0][0], 'order.status_changed');
    assert.equal(app.delivered[0][1].id, 'q4m8z');
    assert.equal(app.delivered[0][2], 'PLACED');
});

test('a bad signature is 401 and handled nowhere', async () => {
    const app = await serve();
    const body = event();
    const res = await app.post(body, headers(body, { secret: 'whsec_someone_else' }));
    // A body changed after signing fails too.
    const tampered = await app.post(event('evt-2'), headers(body));
    await app.settle();
    await app.close();

    assert.equal(res.status, 401);
    assert.equal(tampered.status, 401);
    assert.equal(app.delivered.length, 0);
});

test('an old timestamp is 401: a captured request cannot be replayed', async () => {
    const app = await serve();
    const body = event();
    const res = await app.post(body, headers(body, { timestamp: nowSeconds() - 10 * 60 }));
    await app.settle();
    await app.close();

    assert.equal(res.status, 401);
    assert.equal(app.delivered.length, 0);
});

test('a retry with the same id is answered 200 but handled once', async () => {
    const app = await serve();
    const body = event('evt-retry');
    const first = await app.post(body, headers(body));
    const retry = await app.post(body, headers(body));
    await app.settle();
    await app.close();

    assert.equal(first.status, 200);
    assert.equal(retry.status, 200);
    assert.equal(app.delivered.length, 1);
});

test('without a signing secret the route answers 503', async () => {
    const warn = console.warn;
    console.warn = () => {};
    const app = await serve('');
    const body = event();
    const res = await app.post(body, headers(body));
    await app.close();
    console.warn = warn;

    assert.equal(res.status, 503);
});
