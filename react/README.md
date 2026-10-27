# Storefront in React (`react/`)

The storefront in React 18 with React Router, in three styles on top of one
shared core. It talks to the Storefront API with the
public key and to the relay (`../server/`) under `/api`; see the root
[`README.md`](../README.md) for keys and running it.

- `/` is a style chooser: two live previews (with the restaurant's real name,
  brand colour and first dishes), and the line that both are the same
  restaurant, menu, prices and checkout through the same API.
- `/classic` is the classic shop (the menu in ruled rows, a bag, a step-by-step checkout).
- `/editorial` shows the same shop as a printed menu: heavy slab type,
  numbered dishes with dotted leaders, chapters per category, and the bag as
  a receipt that prints as you order.
- `/diner` shows it as a diner's menu card: two columns of categories with
  dotted leaders, and the bag as a guest check that adds up as you order.

All styles share the cart (switching keeps it), the quote and the checkout
behaviour. The chosen style is remembered (`sf-style` in localStorage): the
relay's payment return `/order/{id}` opens in it, classic when there is none.
Each shop header has a small "Change style" link back to `/`.

```bash
cp .env.example .env.local   # VITE_UNIPAGE_API_URL, VITE_UNIPAGE_PUBLIC_KEY
npm install
npm run dev                  # http://localhost:5173, /api proxied to BFF_URL (default http://localhost:8787)
npm run build                # dist/, served by the relay (STATIC_DIR, default ../react/dist)
```

| Path | |
|---|---|
| `src/api.js`, `format.js`, `options.js`, `storage.js`, `scrollLock.js` | framework-free helpers |
| `src/store.js` | a tiny store (`createStore`, `useStore` on `useSyncExternalStore`) |
| `src/state/` | shop (store, menu, order type), cart (lines, live quote, persistence), schedule (cart-aware slots), ui (drawer, toast) |
| `src/shared/` | what both styles share: `shopStyle.js` (the style list, the remembered choice, the base path), `useCheckout.js`, `useOrderStatus.js`, `useProductDetail.js` (the checkout, confirmation and product-dialog behaviour) |
| `src/chooser/` | the style chooser at `/` |
| `src/classic/ClassicShell.jsx` + `src/components/`, `src/views/` | the classic style; each component imports its own CSS |
| `src/diner/` | the diner style; all its CSS in `diner.css`, scoped under `.dn`, reusing the same shared components |
| `src/editorial/` | the editorial style; all its CSS in `editorial.css`, scoped under `.ed`, reusing the shared SlotPicker, OptionGroup, Stepper and QuoteTotals |

To add a style: a shell under its own path that provides `BaseContext`, its
pages built on the hooks in `src/shared/`, and an entry in `STYLES`.
