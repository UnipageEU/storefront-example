// The order relay: holds the Unipage SECRET key and forwards checkout + order
// status to the Storefront API. The storefront reads everything else from
// Unipage directly. Also serves the built storefront (STATIC_DIR).
// Zero dependencies: node:http + global fetch.

import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { ApiError } from './errors.js';
import { createRelay } from './relay.js';
import { createWebhookHandler } from './webhooks.js';

if (config.allowInsecureTls) {
    // Global fetch reads this per connection; set before the first request.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('[relay] TLS certificate verification is OFF (local development host). Never run like this against production.');
}

const MAX_BODY = 1024 * 1024;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
};

function sendJson(res, status, data, headers = {}) {
    const body = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(body);
}

async function readRaw(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY) {
            throw new ApiError('VALIDATION', 'Request body too large', { status: 413 });
        }
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

async function readJson(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY) {
            throw new ApiError('VALIDATION', 'Request body too large', { status: 413 });
        }
        chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    if (!text.trim()) {
        return {};
    }
    try {
        return JSON.parse(text);
    } catch {
        throw new ApiError('VALIDATION', 'Request body is not valid JSON');
    }
}

// Static files from the built storefront, falling back to index.html for SPA routes.
async function serveStatic(distDir, req, res, pathname) {
    let file = path.normalize(path.join(distDir, decodeURIComponent(pathname)));
    if (file !== distDir && !file.startsWith(distDir + path.sep)) {
        return false;
    }
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) {
        file = path.join(file, 'index.html');
        info = await stat(file).catch(() => null);
    }
    let fallback = false;
    if (!info?.isFile()) {
        if (path.extname(pathname)) {
            return false; // a missing asset is a 404, not the SPA shell
        }
        file = path.join(distDir, 'index.html');
        info = await stat(file).catch(() => null);
        fallback = true;
        if (!info?.isFile()) {
            return false;
        }
    }
    const immutable = !fallback && pathname.startsWith('/assets/');
    res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': info.size,
        'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') {
        res.end();
    } else {
        createReadStream(file).pipe(res);
    }
    return true;
}

function corsHeaders(req, res) {
    const origin = req.headers.origin;
    if (!origin) {
        return;
    }
    let allowed = origin === config.corsOrigin;
    try {
        const host = new URL(origin).hostname;
        allowed ||= host === 'localhost' || host === '127.0.0.1';
    } catch {
        // ignore malformed origins
    }
    if (allowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
}

// Read routes the SPA calls on the Storefront API directly, never through this relay.
const MOVED = /^\/api\/(store|menu|products\/[^/]+|schedule|cart\/quote)$/;

export function createApp(relay, { staticDir = config.staticDir, webhooks = createWebhookHandler({ secret: config.webhookSecret }) } = {}) {
    const routes = [
        ['POST', /^\/api\/checkout$/, (m, body) => relay.checkout(body)],
        ['GET', /^\/api\/orders\/([^/]+)$/, (m) => relay.order(decodeURIComponent(m[1]))],
    ];

    return async function handle(req, res) {
        const started = Date.now();
        const url = new URL(req.url, 'http://localhost');
        res.on('finish', () => {
            console.log(`${req.method} ${url.pathname}${url.search} ${res.statusCode} ${Date.now() - started}ms`);
        });
        try {
            // Order webhooks from Unipage: verified on the raw body, answered at once.
            if (url.pathname === '/webhooks/unipage') {
                if (req.method !== 'POST') {
                    return sendJson(res, 405, { error: { code: 'NOT_FOUND', message: `Method ${req.method} not allowed` } });
                }
                const result = webhooks(req.headers, await readRaw(req));
                return sendJson(res, result.status, { ok: result.status === 200 });
            }
            if (url.pathname.startsWith('/api/')) {
                corsHeaders(req, res);
                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    return res.end();
                }
                const pathMatches = routes.filter(([, pattern]) => pattern.test(url.pathname));
                const route = pathMatches.find(([method]) => method === req.method);
                if (!route) {
                    if (pathMatches.length > 0) {
                        return sendJson(res, 405, { error: { code: 'NOT_FOUND', message: `Method ${req.method} not allowed` } });
                    }
                    if (MOVED.test(url.pathname)) {
                        throw new ApiError('NOT_FOUND', 'Read routes are served by the Unipage Storefront API (VITE_UNIPAGE_API_URL), not by this relay');
                    }
                    throw new ApiError('NOT_FOUND', 'Unknown endpoint');
                }
                const body = req.method === 'POST' ? await readJson(req) : undefined;
                if (req.method === 'POST' && (body === null || typeof body !== 'object' || Array.isArray(body))) {
                    throw new ApiError('VALIDATION', 'Request body must be a JSON object');
                }
                const result = await route[2](url.pathname.match(route[1]), body);
                return sendJson(res, result.status, result.body, result.headers);
            }
            if ((req.method === 'GET' || req.method === 'HEAD') && (await serveStatic(staticDir, req, res, url.pathname))) {
                return;
            }
            throw new ApiError('NOT_FOUND', 'Not found');
        } catch (error) {
            if (error instanceof ApiError) {
                return sendJson(res, error.status, error.toJSON());
            }
            console.error('[relay] unhandled error', error);
            return sendJson(res, 500, { error: { code: 'UPSTREAM', message: 'Internal error' } });
        }
    };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const relay = createRelay({
        apiUrl: config.apiUrl,
        secretKey: config.secretKey,
        publicUrl: config.publicUrl,
        timeoutMs: config.upstreamTimeoutMs,
        customerNotifications: config.customerNotifications,
    });
    const server = http.createServer(createApp(relay));
    server.on('error', (error) => {
        console.error(`[relay] cannot listen on :${config.port}: ${error.code || error.message}`);
        process.exit(1);
    });
    server.listen(config.port, () => {
        console.log(`[relay] listening on http://localhost:${config.port}`);
        console.log(`[relay] Storefront API ${config.apiUrl}, returnUrl ${config.publicUrl}/order/{orderId}`);
        if (!config.webhookSecret) {
            console.log('[relay] UNIPAGE_WEBHOOK_SECRET is not set: POST /webhooks/unipage answers 503');
        }
        if (!config.secretKey) {
            console.warn('[relay] UNIPAGE_SECRET_KEY is not set: checkout and order status will answer UPSTREAM 502');
        }
        console.log(`[relay] storefront from ${config.staticDir} (if built)`);
    });
}
