// All configuration comes from the environment. The defaults point at the
// public Unipage Storefront API and the Vite dev server.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function trimSlash(url) {
    return url.replace(/\/+$/, '');
}

const apiUrl = trimSlash(process.env.UNIPAGE_API_URL || 'https://api.unipage.eu/storefront/v1');

const isLocalHost = (url) => {
    try {
        const { hostname } = new URL(url);
        return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.test');
    } catch {
        return false;
    }
};

// Local development hosts (localhost, *.test) often use self-signed
// certificates. Default on only for such a URL, so a production config never
// silently skips TLS.
const allowInsecureTls =
    process.env.ALLOW_INSECURE_TLS !== undefined
        ? process.env.ALLOW_INSECURE_TLS === '1' || process.env.ALLOW_INSECURE_TLS === 'true'
        : isLocalHost(apiUrl);

export const config = {
    port: Number(process.env.PORT || 8787),
    // Storefront API base, including /storefront/v1.
    apiUrl,
    // upg_sf_sk_... secret key: never leaves this process.
    secretKey: process.env.UNIPAGE_SECRET_KEY || '',
    // The SPA's origin; Unipage sends the shopper back to
    // `${publicUrl}/order/{orderId}` after an online payment.
    publicUrl: trimSlash(process.env.PUBLIC_URL || 'http://localhost:5173'),
    allowInsecureTls,
    // Extra origin allowed to call /api cross-origin (the SPA dev server is
    // normally proxied, so this is only for setups without the proxy).
    corsOrigin: process.env.CORS_ORIGIN || null,
    // CUSTOMER_NOTIFICATIONS=false: Unipage sends the customer nothing and this
    // server does (see onOrderEvent in src/webhooks.js). Default: Unipage mails.
    customerNotifications: !['0', 'false'].includes(String(process.env.CUSTOMER_NOTIFICATIONS ?? 'true').toLowerCase()),
    // whsec_... signing secret of the storefront's order webhook (POST /webhooks/unipage).
    webhookSecret: process.env.UNIPAGE_WEBHOOK_SECRET || '',
    upstreamTimeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS || 15_000),
    // The built storefront to serve next to /api ("one process" mode).
    // A relative path is resolved from the server folder.
    staticDir: path.resolve(serverDir, process.env.STATIC_DIR || '../react/dist'),
};
