# Order relay (`server/`)

The Node backend of the example: holds the Unipage SECRET key and offers
[two routes](#routes) that forward to the Storefront API. Everything else the
storefront reads from Unipage itself, with the public key. Node 22.9+, zero dependencies (`node:http`, global `fetch`,
`node:test`).

Configuration comes from the environment or from `server/.env` (copy
`.env.example`; the file is read on start and never committed).

```bash
npm start      # http://localhost:8787 (PORT to change)
npm run dev    # same, restarts on file changes
npm test       # unit + http tests, upstream stubbed (binds a random local port)
```

When the built storefront in `STATIC_DIR` exists it is served too (static
files, SPA fallback to `index.html` for every non-`/api` GET without a file
extension), so production is one process:

```bash
cd ../react && npm run build
cd ../server && STATIC_DIR=../react/dist PUBLIC_URL=https://shop.example.com UNIPAGE_SECRET_KEY=upg_sf_sk_... npm start
```

| Env | Default | |
|---|---|---|
| `UNIPAGE_SECRET_KEY` | none | `upg_sf_sk_...` secret key; without it both routes answer `UPSTREAM` 502 |
| `UNIPAGE_API_URL` | `https://api.unipage.eu/storefront/v1` | Storefront API base, including `/storefront/v1` |
| `PUBLIC_URL` | `http://localhost:5173` | the storefront's origin; `returnUrl` = `${PUBLIC_URL}/order/{orderId}` |
| `STATIC_DIR` | `../react/dist` | the built storefront to serve, relative to `server/` |
| `ALLOW_INSECURE_TLS` | on only when `UNIPAGE_API_URL` is `localhost` or a `.test` host | disables TLS verification (self-signed local certs); never in production |
| `CORS_ORIGIN` | none | extra origin allowed on `/api` (localhost origins always are) |
| `UPSTREAM_TIMEOUT_MS` | 15000 | per Unipage call |
| `UNIPAGE_WEBHOOK_SECRET` | none | `whsec_...` signing secret of the storefront's order webhook; without it `POST /webhooks/unipage` answers 503 |
| `CUSTOMER_NOTIFICATIONS` | `true` | `false`: orders are placed with `customerNotifications: false`, so Unipage sends the customer nothing and this server does (from the webhook) |

## Routes

The storefront calls these under `/api` (Vite proxies `/api` to this server
in development). Bodies are JSON; money, times, ids and the `Order` shape are
as in the [Storefront API reference](https://developer.unipage.be/storefront/api/).

### `POST /api/checkout`

```json
{
  "orderType": "TAKEOUT",
  "slotAt": 1792750500,
  "lines": [CartLine],
  "customer": { "firstName": "Ann", "lastName": "Example", "email": "ann@example.com", "phone": "+32470000000" },
  "delivery": { "zoneId": "z81qm", "street": "Main Street", "number": "1", "postcode": "1000", "city": "Brussels" },
  "paymentType": "online",
  "notes": "Ring twice",
  "coupon": null,
  "locale": "en"
}
```

`CartLine` is the quote's. `delivery` is required for `DELIVERY` and ignored
for `TAKEOUT`. The relay forwards the body to `POST /storefront/v1/orders`
with the secret key, and decides three things itself:

- **`returnUrl`** is always `${PUBLIC_URL}/order/{orderId}`; one from the browser is ignored.
- **`paymentType: "external"` is refused** (`VALIDATION`): it places an order as
  already paid, so only server code that has confirmed its own payment may
  send it. `payment` and `customerNotifications` from the browser are
  dropped; the relay sends `customerNotifications: false` itself when
  `CUSTOMER_NOTIFICATIONS=false`. A storefront that collects the payment with
  its own provider adds `"paymentType": "external"` and
  `"payment": { "provider", "reference" }` here, after the payment is confirmed.
- **`locale`** is kept only when it is `nl`, `fr`, `en`, `de` or `es`;
  otherwise Unipage uses the restaurant's language.

Response `201`:

```json
{ "orderId": "q4m8z", "order": Order, "next": { "type": "payment", "url": "https://..." } }
```

For `next.type: "payment"` the storefront sends the browser to `next.url`
(Unipage brings the shopper back to `/order/{orderId}`); for
`"confirmation"` (offline payment) it shows its own confirmation page.

### `GET /api/orders/:id`

Forwards `GET /storefront/v1/orders/{id}` and answers its `Order` as is. An
unknown id, an order of another restaurant or a malformed id is `NOT_FOUND` (404).

### Errors

Unipage's own errors are passed through with Unipage's status (and
`Retry-After` on a 429); codes in the
[errors guide](https://developer.unipage.be/storefront/errors/). The relay
adds one: `UPSTREAM` (502) when Unipage cannot be reached, times out, answers
something unexpected, or no secret key is configured.

## Layout

| File | |
|---|---|
| `src/index.js` | http server, router, static + SPA fallback, JSON errors, request log |
| `src/relay.js` | the two forwards: secret key, `returnUrl`, `locale`, error passthrough, `UPSTREAM` mapping |
| `src/config.js` | environment |
| `src/errors.js` | the error shape |
| `src/webhooks.js` | `POST /webhooks/unipage`: signature check, repeats dropped, `onOrderEvent()` |

## Order webhooks

Unipage can push the storefront's orders to `POST /webhooks/unipage`
(`order.created`, `order.paid`, `order.status_changed`; see
[the webhooks guide](https://developer.unipage.be/storefront/webhooks/)). Ask Unipage to set
the webhook URL to `https://<this server>/webhooks/unipage` and put the
signing secret you get in `UNIPAGE_WEBHOOK_SECRET`. The relay checks the
`X-Unipage-Signature` HMAC over `<timestamp>.<raw body>` in constant time,
refuses a timestamp older than 5 minutes (401), answers a repeated event `id`
with 200 without handling it again, answers 200 at once and then calls
`onOrderEvent(event, order, previousStatus)` in `src/webhooks.js`. That
function only logs what a storefront would do ("would send the confirmation
of order ... to ..."): put your own mails or SMS there, and run with
`CUSTOMER_NOTIFICATIONS=false` so the customer does not get Unipage's
messages as well. The server must be reachable from the internet for this
(in development, through a tunnel to `localhost:8787`).
