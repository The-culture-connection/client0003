import {defineSecret} from "firebase-functions/params";

/** Stripe secret API key (`sk_test_…` or `sk_live_…`). Prefer a restricted key in production. */
export const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

/** Webhook signing secret from the Stripe Dashboard (`whsec_…`). */
export const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
