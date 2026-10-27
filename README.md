# Storefront example on the Unipage Storefront API

An example of a fully custom webshop on top of a [Unipage](https://www.unipage.be)
restaurant: your own storefront, with Unipage as the source of truth for the
catalog, opening hours, order slots, prices and orders. It talks to the
[Unipage Storefront API v1](https://developer.unipage.be/storefront/api/).

| Folder | What |
|---|---|
| `react/` | the storefront in React 18 (+ React Router), with a style chooser at `/`: the classic look (`/classic`), a printed-menu look with a receipt (`/editorial`) and a diner menu card with a guest check (`/diner`) on the same API, relay and cart |
| `server/` | a small Node relay that holds the **secret** key |

- The storefront reads the store, menu, products, schedule and quote straight
  from Unipage with the **public** key. That key is in the browser bundle on
  purpose: Unipage only accepts it from the origins registered for it, and it
  cannot place orders.
- The relay does two things: place an order and read one back
  ([routes](server/README.md#routes)). It has no catalog, slot or price logic of
  its own. Zero dependencies.
- Unipage is authoritative: the schedule and the quote come from the same code
  that validates and prices the order.

## Getting keys

There are two keys per restaurant, issued by Unipage:

- a **public key** (`upg_sf_pk_...`), used by the storefront in the browser;
- a **secret key** (`upg_sf_sk_...`), used by the relay on the server.

How to request them, and how the public key's registered origins work, is in
[Keys and CORS](https://developer.unipage.be/storefront/keys/).

## Running it

Needs Node 22.9 or newer.

```bash
# the relay, on :8787
cd server
cp .env.example .env            # fill in the secret key
npm start

# the storefront, on :5173 (/api is proxied to the relay)
cd react
cp .env.example .env.local      # fill in the public key
npm install
npm run dev
```

One process, production style: `npm run build` in `react/` (the
`VITE_*` values are baked in at build time), then `npm start` in `server/`
with `STATIC_DIR` pointing at that build and `PUBLIC_URL` set to the origin it
is served from. The relay then serves the storefront and `/api` on one port.

| App | Variable | |
|---|---|---|
| `react/` | `VITE_UNIPAGE_API_URL` | Storefront API base including `/storefront/v1`, default in `.env.example`: `https://api.unipage.eu/storefront/v1` |
| `react/` | `VITE_UNIPAGE_PUBLIC_KEY` | `upg_sf_pk_...` (the public key, never the secret one) |
| `react/` (dev) | `BFF_URL` (shell) | `/api` proxy target, default `http://localhost:8787` |
| `server/` | `UNIPAGE_SECRET_KEY` | `upg_sf_sk_...`; never in the storefront |
| `server/` | `UNIPAGE_API_URL` | Storefront API base including `/storefront/v1`, default `https://api.unipage.eu/storefront/v1` |
| `server/` | `PUBLIC_URL` | the storefront's origin, default `http://localhost:5173`; payments return to `${PUBLIC_URL}/order/{orderId}` |
| `server/` | `STATIC_DIR` | the built storefront to serve, default `../react/dist` |
| `server/` | `UNIPAGE_WEBHOOK_SECRET` | `whsec_...` signing secret of the order webhook (`POST /webhooks/unipage`), optional |
| `server/` | `CUSTOMER_NOTIFICATIONS` | `false` to send your own customer messages instead of Unipage's, default `true` |

More relay settings (CORS, timeout, TLS for local hosts) are in
[`server/README.md`](server/README.md).

## Payments

The storefront offers the restaurant's own payment options (`payment.methods`
in `GET /store`): pay online through Unipage's payment page (the shopper is
sent to `next.url` and comes back to `/order/{orderId}`) or pay at pickup /
on delivery. A storefront that takes the payment with its own provider
(Stripe, Mollie, ...) charges the shopper itself and places the order with
`"paymentType": "external"` and a `payment` reference: it arrives already
paid ([payments](https://developer.unipage.be/storefront/payments/)). That decision belongs on
the server, after the payment is confirmed: the relay refuses `external` from
the browser.

## Customer messages and webhooks

By default Unipage sends the customer its confirmation and status messages.
A storefront that wants to send its own places orders with
`customerNotifications: false` (relay: `CUSTOMER_NOTIFICATIONS=false`) and
listens to the order webhooks Unipage sends to `POST /webhooks/unipage` on
the relay (`order.created`, `order.paid`, `order.status_changed`). See
[`server/README.md`](server/README.md#order-webhooks).

## How errors reach the shopper

Every error from Unipage or the relay has one shape, `{ error: { code,
message, fields? } }`. The storefront shows `message`, except where a code
needs more:

| Code | Where it shows |
|---|---|
| `VALIDATION` | `fields` on their form field, the rest in the checkout banner |
| `SLOT_UNAVAILABLE` | the chosen time is cleared, the schedule reloads, "pick another time" |
| `PRODUCT_UNAVAILABLE` | banner, menu and quote reload |
| `DELIVERY_UNAVAILABLE` | banner, error on the delivery area |
| `COUPON_INVALID` | under the discount code field; the code is dropped so the total updates |
| `MINIMUM_NOT_REACHED` | banner, quote reloads (the cart shows how much is missing) |
| `RATE_LIMITED` | "try again in N seconds" from `Retry-After`; the quote and the order status poll retry by themselves |
| `UNAUTHENTICATED`, `FORBIDDEN` | "this shop is not set up correctly" (details in the console: wrong key or unregistered origin) |
| `UPSTREAM`, network | "could not reach the restaurant, try again" |

## What the example covers

Takeout and delivery (postcode zones), the menu with option groups, allergens
with their sources, a slot picker that follows the cart's preparation times,
a live quote with service cost, delivery cost, store charges and coupons
(priced at the chosen slot, so a store's time-based menu plans apply),
online and offline payment, and an order status page.

Not covered: customer accounts and login, loyalty, wallet, group orders,
combo menus, products priced by weight, other delivery zone types, eat-in and
table ordering, tips, and translating the storefront itself (the interface is
English and orders are placed with `locale: "en"`; menu texts come in the
store's language).

## License

[MIT](LICENSE)
