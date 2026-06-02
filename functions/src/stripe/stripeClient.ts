import Stripe from "stripe";
import {STRIPE_SECRET_KEY} from "./stripeSecrets";

export function getStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

/** Stripe secret keys start with `sk_` (or restricted `rk_`). Not Firebase `AIza…` keys. */
export function assertValidStripeSecretKey(key: string): void {
  const trimmed = key.trim();
  if (/^sk_(test|live)_/i.test(trimmed) || /^rk_(test|live)_/i.test(trimmed)) {
    return;
  }
  if (/^AIza/i.test(trimmed) || /^firebase/i.test(trimmed)) {
    throw new Error(
      "STRIPE_SECRET_KEY looks like a Firebase/Google API key. In Firebase Secret Manager, set STRIPE_SECRET_KEY to your Stripe secret key from Dashboard → Developers → API keys (starts with sk_test_ or sk_live_)."
    );
  }
  if (/^whsec_/i.test(trimmed)) {
    throw new Error(
      "STRIPE_SECRET_KEY is a webhook signing secret (whsec_…). Use the Stripe **Secret key** (sk_test_… / sk_live_…) for STRIPE_SECRET_KEY, and put whsec_… in STRIPE_WEBHOOK_SECRET only."
    );
  }
  throw new Error(
    "STRIPE_SECRET_KEY must be a Stripe secret or restricted key (sk_test_…, sk_live_…, or rk_…). See docs/STRIPE_SETUP.md."
  );
}

export function resolveStripeSecretKey(): string {
  const fromSecret = STRIPE_SECRET_KEY.value()?.trim();
  const fromEnv = process.env.STRIPE_SECRET_KEY?.trim();
  const key = fromSecret || fromEnv;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  assertValidStripeSecretKey(key);
  return key;
}
