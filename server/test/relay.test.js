import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRelay } from '../src/relay.js';
import { createApp } from '../src/index.js';
import { ApiError } from '../src/errors.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CONFIG = { apiUrl: 'https://storefront-api.example.test/storefront/v1', secretKey: 'upg_sf_sk_example_fake.not-a-real-secret', publicUrl: 'https://shop.example.com' };
const silent = { error() {}, log() {} };

const ORDER = {
    id: 'q4m8z', status: 'PLACED', label: 'Order received', orderType: 'TAKEOUT', slotAt: 1792750500,
    paymentType: 'offline', isPaid: false,
    lines: [{ productId: 'p7d2x', name: 'Medium fries', quantity: 1, optionsLabel: '', total: 4 }],
    subtotal: 4, deliveryCost: 0, serviceCost: 0.5, couponDiscount: 0, total: 4.5,
    customer: { firstName: 'Ann', lastName: 'Example' }, createdAt: 1792749000,
};

// A fetch that records its calls and answers from a queue.
function stubFetch(...answers) {
    const calls = [];
    const fetchImpl = async (url, init) => {
        calls.push({ url, ...init, body: init.body === undefined ? undefined : JSON.parse(init.body) });
        const answer = answers.shift();
        if (answer instanceof Error) throw answer;
        const { status = 200, json, text, headers = {} } = answer;
        return new Response(text ?? JSON.stringify(json), { status, headers });
    };
    return { fetchImpl, calls };
}

const relayWith = (stub, config = CONFIG) => createRelay(config, { fetchImpl: stub.fetchImpl, log: silent });

test('checkout forwards to POST /orders with the secret key, returnUrl and locale', async () => {
    const stub = stubFetch({ status: 201, json: { order: ORDER, next: { type: 'confirmation' } } });
    const body = { orderType: 'TAKEOUT', slotAt: 1792750500, lines: [{ productId: 'p7d2x', quantity: 1 }], returnUrl: 'https://evil.example' };

    const result = await relayWith(stub).checkout(body);

    assert.equal(stub.calls.length, 1);
    const call = stub.calls[0];
    assert.equal(call.url, 'https://storefront-api.example.test/storefront/v1/orders');
    assert.equal(call.method, 'POST');
    assert.equal(call.headers.Authorization, 'Bearer upg_sf_sk_example_fake.not-a-real-secret');
    assert.equal(call.body.returnUrl, 'https://shop.example.com/order/{orderId}', 'a client returnUrl is never forwarded');
    assert.equal('locale' in call.body, false, 'no locale: Unipage uses the store language');
    assert.deepEqual(call.body.lines, body.lines);
    assert.deepEqual(result, { status: 201, body: { orderId: 'q4m8z', order: ORDER, next: { type: 'confirmation' } } });
});

test('checkout keeps a supported locale and drops an unknown one', async () => {
    const stub = stubFetch(
        { status: 201, json: { order: ORDER, next: { type: 'payment', url: 'https://pay' } } },
        { status: 201, json: { order: ORDER, next: { type: 'confirmation' } } },
    );
    await relayWith(stub).checkout({ locale: 'es' });
    await relayWith(stub).checkout({ locale: 'xx' });
    assert.equal(stub.calls[0].body.locale, 'es');
    assert.equal('locale' in stub.calls[1].body, false);
});

test('Unipage errors pass through with their status and Retry-After', async () => {
    const error = { code: 'SLOT_UNAVAILABLE', message: 'Slot is full' };
    const stub = stubFetch(
        { status: 422, json: { error } },
        { status: 429, json: { error: { code: 'RATE_LIMITED', message: 'Slow down' } }, headers: { 'Retry-After': '12' } },
    );
    const relay = relayWith(stub);

    assert.deepEqual(await relay.checkout({}), { status: 422, body: { error }, headers: {} });
    const limited = await relay.checkout({});
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.code, 'RATE_LIMITED');
    assert.deepEqual(limited.headers, { 'Retry-After': '12' });
});

test('network failure and unexpected answers become UPSTREAM 502', async () => {
    const stub = stubFetch(
        new TypeError('fetch failed'),
        { status: 500, text: '<html>Server Error</html>' },
        { status: 201, text: 'not json' },
        { status: 201, json: { next: { type: 'confirmation' } } },
    );
    const relay = relayWith(stub);
    for (let i = 0; i < 4; i++) {
        await assert.rejects(relay.checkout({}), (e) => e instanceof ApiError && e.code === 'UPSTREAM' && e.status === 502);
    }
});

test('without a secret key nothing is sent upstream', async () => {
    const stub = stubFetch();
    await assert.rejects(relayWith(stub, { ...CONFIG, secretKey: '' }).order('q4m8z'), { code: 'UPSTREAM' });
    assert.equal(stub.calls.length, 0);
});

test('order forwards GET /orders/{id}; a malformed id is a 404 without a call', async () => {
    const stub = stubFetch({ json: ORDER }, { status: 404, json: { error: { code: 'NOT_FOUND', message: 'Order not found' } } });
    const relay = relayWith(stub);

    assert.deepEqual(await relay.order('q4m8z'), { status: 200, body: ORDER });
    assert.equal(stub.calls[0].url, 'https://storefront-api.example.test/storefront/v1/orders/q4m8z');
    assert.equal(stub.calls[0].method, 'GET');
    assert.equal(stub.calls[0].headers.Authorization, 'Bearer upg_sf_sk_example_fake.not-a-real-secret');

    assert.equal((await relay.order('foreign1')).status, 404);
    await assert.rejects(relay.order('../store'), { code: 'NOT_FOUND', status: 404 });
    assert.equal(stub.calls.length, 2);
});

// HTTP layer: routing, status and header passthrough.
async function withServer(relay, fn, options) {
    const server = http.createServer(createApp(relay, options));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        await fn(base);
    } finally {
        server.close();
    }
}

test('http: checkout and order status are routed, errors keep their status', async (t) => {
    t.mock.method(console, 'log', () => {});
    const stub = stubFetch(
        { status: 201, json: { order: ORDER, next: { type: 'confirmation' } } },
        { status: 429, json: { error: { code: 'RATE_LIMITED', message: 'Slow down' } }, headers: { 'Retry-After': '3' } },
    );
    await withServer(relayWith(stub), async (base) => {
        const placed = await fetch(`${base}/api/checkout`, { method: 'POST', body: JSON.stringify({ orderType: 'TAKEOUT' }) });
        assert.equal(placed.status, 201);
        assert.equal((await placed.json()).orderId, 'q4m8z');

        const limited = await fetch(`${base}/api/orders/q4m8z`);
        assert.equal(limited.status, 429);
        assert.equal(limited.headers.get('retry-after'), '3');
        assert.equal((await limited.json()).error.code, 'RATE_LIMITED');

        const moved = await fetch(`${base}/api/menu?orderType=TAKEOUT`);
        assert.equal(moved.status, 404);
        assert.match((await moved.json()).error.message, /Storefront API/);

        const bad = await fetch(`${base}/api/checkout`, { method: 'POST', body: '[1]' });
        assert.equal(bad.status, 422);
        assert.equal((await bad.json()).error.code, 'VALIDATION');
    });
    assert.equal(stub.calls.length, 2);
});

test('http: serves the built storefront from STATIC_DIR, with the SPA fallback', async (t) => {
    t.mock.method(console, 'log', () => {});
    const dir = await mkdtemp(path.join(tmpdir(), 'storefront-dist-'));
    await mkdir(path.join(dir, 'assets'));
    await writeFile(path.join(dir, 'index.html'), '<!doctype html><title>shop</title>');
    await writeFile(path.join(dir, 'assets', 'app.js'), 'console.log(1)');
    try {
        await withServer(relayWith(stubFetch()), async (base) => {
            const asset = await fetch(`${base}/assets/app.js`);
            assert.equal(asset.status, 200);
            assert.match(asset.headers.get('content-type'), /javascript/);
            assert.match(asset.headers.get('cache-control'), /immutable/);

            const route = await fetch(`${base}/order/q4m8z`);
            assert.equal(route.status, 200);
            assert.match(await route.text(), /<title>shop<\/title>/);

            assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
            const traversal = await fetch(`${base}/..%2F..%2Fetc%2Fpasswd`);
            assert.equal(traversal.status, 404, 'a path outside STATIC_DIR is never served');
            assert.doesNotMatch(await traversal.text(), /root:/);
        }, { staticDir: dir });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('the browser cannot pay with "external" or decide who mails the customer', async () => {
    const stub = stubFetch({ status: 201, json: { order: ORDER, next: { type: 'confirmation' } } });
    const relay = relayWith(stub);

    await assert.rejects(
        relay.checkout({ orderType: 'TAKEOUT', paymentType: 'external', payment: { provider: 'x', reference: 'y' } }),
        (error) => error instanceof ApiError && error.code === 'VALIDATION',
    );
    assert.equal(stub.calls.length, 0);

    await relay.checkout({ orderType: 'TAKEOUT', paymentType: 'offline', payment: { provider: 'x' }, customerNotifications: false });
    assert.equal(stub.calls[0].body.payment, undefined);
    assert.equal(stub.calls[0].body.customerNotifications, undefined);
});

test('CUSTOMER_NOTIFICATIONS=false makes the relay ask Unipage not to message the customer', async () => {
    const stub = stubFetch({ status: 201, json: { order: ORDER, next: { type: 'confirmation' } } });

    await relayWith(stub, { ...CONFIG, customerNotifications: false }).checkout({ orderType: 'TAKEOUT', paymentType: 'offline' });

    assert.equal(stub.calls[0].body.customerNotifications, false);
});
