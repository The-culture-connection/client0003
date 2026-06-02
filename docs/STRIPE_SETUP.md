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
| `createStripeCheckoutSession` | Callable | Creates `payment_orders/{id}` + Stripe Checkout Session |
| `stripeWebhook` | HTTP | Verifies signature; fulfills or marks failed |

### Secrets (Firebase)

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY --project <project-id>
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project <project-id>
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
