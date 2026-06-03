# Stripe payments (Mortar)

End-to-end flow:

```text
Frontend → createStripeCheckoutSession (callable) → Stripe Checkout
→ Stripe webhook (stripeWebhook) → Firestore access + analytics
→ Stripe payout to your bank (Dashboard / Connect)
```

## Cloud Functions

| Export | Type | Purpose |
|--------|------|---------|
| `createStripeCheckoutSession` | Callable (`invoker: "public"`, `cors: true`) | Creates `payment_orders/{id}` + Stripe Checkout Session |
| `stripeWebhook` | HTTP | Verifies signature; fulfills or marks failed |

### Secrets (Firebase)

| Secret | Where to get it | Must start with |
|--------|-----------------|-----------------|
| `STRIPE_SECRET_KEY` | [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys) → **Secret key** → Reveal | `sk_test_` or `sk_live_` (or restricted `rk_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint → **Signing secret** | `whsec_` |

**Do not** put a Firebase config value here (e.g. `AIza…` from Firebase console, or any key whose name contains `firebase`). Stripe will return `Invalid API Key provided: firebase…`.

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY --project <project-id>
# When prompted, paste only the Stripe secret key (sk_test_… or sk_live_…).

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project <project-id>
# Paste the webhook signing secret (whsec_…) — not the sk_ key.

firebase deploy --only functions:createStripeCheckoutSession,functions:stripeWebhook --project <project-id>
```

Optional env (already used elsewhere):

- `DIGITAL_CURRICULUM_PLATFORM_URL` — success/cancel redirect base (e.g. `https://mortar-stage-stage.up.railway.app`)

Deploy:

```bash
cd functions && npm run build
firebase deploy --only functions:createStripeCheckoutSession,functions:stripeWebhook --project <project-id>
```

### Webhook URL

After deploy:

`https://us-central1-<project-id>.cloudfunctions.net/stripeWebhook`

In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), subscribe to:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`

Use the signing secret as `STRIPE_WEBHOOK_SECRET`.

## Purchase types

| Type | Client payload | Firestore after success |
|------|----------------|-------------------------|
| **module** | `course_id`, `module_id` | `users/{uid}.membership.paid_modules` += module id |
| **event** | `event_id`, `event_collection` | `registered_users` on `events` / `events_mobile` |
| **shop** | `lines[]` | `shop_orders/{orderId}`; cart stock stays reserved |

Prices are resolved **only on the server** from `courses`, `events` / `events_mobile`, and `shopItems`.

### Tax (all paid checkout types)

#### Mortar policy (MORTAR Cincinnati)

| Question | Answer |
|----------|--------|
| Charge sales tax? | **Yes** |
| Jurisdiction | **Ohio, USA** (register Ohio in Stripe Tax; other states only if you add registrations later) |
| Products taxable? | **Yes** — shop merch, paid course modules, paid event tickets |
| Subscriptions taxable? | **No** — Mortar Checkout uses **`mode: payment`** (one-time) only; no recurring Stripe subscriptions in this flow |
| Use Stripe Tax? | **Yes** — this **is** how Ohio sales tax is calculated and collected at Checkout (not a separate fee on top of your prices) |
| Tax ID on file | **EIN 47-2431620** — legal entity **MORTAR Cincinnati** (confirm in Stripe Dashboard → Settings → Business / Tax) |

**Stripe Tax vs “Ohio sales tax”:** Customers see subtotal + **tax** + total on Checkout. Stripe Tax applies your **Ohio registration** and product tax categories; you remit using Stripe Tax reports / filings (per your Stripe Tax plan). You are not double-charging by enabling both.

#### Code behavior

Checkout sessions set **`automatic_tax: { enabled: true }`**. Line items include Stripe **product tax codes** (`functions/src/stripe/stripeTaxCodes.ts`):

| Purchase type | Stripe tax code | Category |
|---------------|-----------------|----------|
| **shop** (apparel, goods) | `txcd_30011000` | Clothing & Footwear |
| **module** | `txcd_20060058` | Training — self-study web-based |
| **event** (ticket) | `txcd_20060044` | Training / workshop sessions |
| **shop shipping** line | `txcd_92010001` | Shipping (official; not `txcd_92020001`) |

- **Module & event:** Stripe collects a **billing address** (required).
- **Shop:** Stripe collects a **US shipping address** (tax uses ship-to where applicable).

After payment, `payment_orders` and `shop_orders` store `subtotal_cents`, `tax_cents`, `shipping_cents`, and `total_cents` from the completed Checkout Session.

#### Stripe Dashboard checklist

1. [Settings → Tax](https://dashboard.stripe.com/settings/tax) — **Enable Stripe Tax**.
2. **Add registration** — United States → **Ohio**.
3. **Business information** — MORTAR Cincinnati, EIN **47-2431620**, Ohio business address.
4. **Test mode** — run a $1+ test checkout with an Ohio address; confirm `tax_cents` is greater than zero on the completed session / Firestore order.
5. **Live mode** — repeat registrations and a live test before marketing paid checkout.

If tax shows **$0** on otherwise taxable carts, Ohio registration is missing, incomplete, or the session address is outside your registered regions.

### Shop shipping

A flat **Standard shipping** line item is added server-side (default **$8.00** USD). Override with Firebase env on the functions runtime:

```bash
# Optional — cents, e.g. 999 = $9.99
SHOP_FLAT_SHIPPING_CENTS=800
```

Redeploy functions after changing env.

### Shop fulfillment (admin)

Paid shop orders are written to **`shop_orders/{orderId}`** with `fulfillment_status: unfulfilled` and the shipping address from Stripe.

Staff manage orders in **Admin → Shop → Shop orders & fulfillment** (Digital Curriculum). Updates go through callable **`adminUpdateShopOrderFulfillment`** (status, tracking number, admin notes).

| `fulfillment_status` | Meaning |
|----------------------|---------|
| `unfulfilled` | Paid, not started |
| `processing` | Being packed |
| `shipped` | Handed to carrier |
| `delivered` | Complete |
| `cancelled` | Will not ship (manual) |

Deploy the new callable:

```bash
firebase deploy --only functions:createStripeCheckoutSession,functions:stripeWebhook,functions:adminUpdateShopOrderFulfillment --project <project-id>
```

Deploy Firestore rules when `shop_orders` / `payment_orders` read rules change:

```bash
firebase deploy --only firestore:rules --project <project-id>
```

### Event pricing fields

On event documents:

- `ticket_price_cents` (integer, preferred), or
- `ticket_price` (dollars)

Omitted or zero = free RSVP (direct registration, no Stripe).

### Module pricing

Uses `courses/{courseId}.modules[].price` (dollars).

## Analytics

Web (Digital Curriculum) and mobile expansion stream:

- `payment_checkout_started`, `payment_checkout_redirected`
- `payment_succeeded`, `payment_failed` (return pages)
- `payment_webhook_succeeded`, `payment_webhook_failed` (server)
- `payment_module_purchase_clicked`, `payment_event_ticket_clicked`, `payment_shop_checkout_clicked`

## Frontend routes (Digital Curriculum)

- `/payment/success?order_id=…&type=module|event|shop`
- `/payment/cancel?order_id=…`

## Mobile (Expansion)

Paid events open Stripe Checkout in the system browser via `StripeCheckoutService`. After payment, the webhook registers the user; refresh the event screen to see RSVP status.

## Testing without real charges (most accurate path)

Use **Stripe Test mode** end-to-end. You still exercise Checkout, webhooks, tax, shipping address, Firestore `shop_orders`, admin fulfillment, and admin push — but card charges are simulated.

### 1. Test API keys everywhere

| Place | Value |
|-------|--------|
| Firebase `STRIPE_SECRET_KEY` | `sk_test_…` from [Stripe test API keys](https://dashboard.stripe.com/test/apikeys) |
| Stripe Dashboard toggle | **Test mode** ON (top-right) |
| Webhook endpoint | Create a **test** webhook pointing at your `stripeWebhook` URL with the same event types |

Redeploy functions after changing secrets.

### 2. Test webhook delivery locally (optional, highest fidelity)

With the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe login
stripe listen --forward-to https://us-central1-<project-id>.cloudfunctions.net/stripeWebhook
```

Copy the CLI’s `whsec_…` into `STRIPE_WEBHOOK_SECRET` for that environment, or use the CLI secret only while listening.

### 3. Run a shop checkout in staging

1. Sign in to Digital Curriculum (staging) as a **test learner**.
2. Add an in-stock shop item (≥ **$0.50** per line).
3. **Checkout with Stripe** — use test card **`4242 4242 4242 4242`**, any future expiry, any CVC, any ZIP.
4. Use an **Ohio** shipping address (e.g. Cincinnati) to verify sales tax appears on the Stripe page.
5. Complete payment → `/payment/success`.

### 4. Verify backend + admin UX

| Check | Where |
|-------|--------|
| Webhook succeeded | Stripe Dashboard → Developers → Webhooks → event log |
| Order doc | Firestore `shop_orders/{orderId}` — `fulfillment_status: unfulfilled`, lines with **name**, tax/shipping cents, **shipping_address** |
| Admin action strip | **Admin Command Center** → **Shop orders to fulfill** count |
| Fulfillment panel | **Admin → Shop** — plain-language item details, amounts, ship-to |
| Push (admins with FCM token) | Notification: “Shop order needs fulfillment” |

### 5. Other purchase types (same test card)

- **Module:** course detail → Buy module (billing address + tax).
- **Event:** paid event → register with payment.

### 6. Stripe Tax in test mode

Enable Stripe Tax and **Ohio** registration in **test mode** as well (Settings → Tax). If tax is $0, confirm Ohio registration and that the address is in a taxable state.

### 7. What test mode does *not* do

- No money moves to your bank (payouts are live-only).
- Emails/receipts may differ from production branding.
- Use **live mode** with a small real charge only when you are ready for a final smoke test.

### 8. Replay a webhook without paying again

Stripe Dashboard → **Developers → Webhooks** → your endpoint → select a `checkout.session.completed` event → **Resend**. Useful to re-test fulfillment if you already have a completed session.
