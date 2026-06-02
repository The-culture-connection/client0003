import Stripe from "stripe";
import {STRIPE_SECRET_KEY} from "./stripeSecrets";

export function getStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

export function resolveStripeSecretKey(): string {
  const fromSecret = STRIPE_SECRET_KEY.value()?.trim();
  const fromEnv = process.env.STRIPE_SECRET_KEY?.trim();
  const key = fromSecret || fromEnv;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return key;
}
