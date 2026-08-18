import type Stripe from "stripe";

export interface MortarAddress {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface CheckoutSnapshot {
  subtotal_cents: number | null;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
  customer_email: string | null;
  shipping_address: MortarAddress | null;
  billing_address: MortarAddress | null;
  /** Answers to any `custom_fields` on the session, keyed by field key. */
  custom_fields: Record<string, string>;
}

/**
 * Flatten Checkout's custom-field answers to `key → value`.
 *
 * Stripe returns the answer under whichever sub-object matches the field type,
 * and only one of them is ever populated.
 */
function extractCustomFields(session: Stripe.Checkout.Session): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of session.custom_fields ?? []) {
    const raw =
      field.dropdown?.value ?? field.text?.value ?? field.numeric?.value ?? null;
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) out[field.key] = value;
  }
  return out;
}

function mapStripeAddress(
  name: string | null | undefined,
  addr: Stripe.Address | null | undefined
): MortarAddress | null {
  if (!addr) return null;
  return {
    name: name ?? null,
    line1: addr.line1 ?? null,
    line2: addr.line2 ?? null,
    city: addr.city ?? null,
    state: addr.state ?? null,
    postal_code: addr.postal_code ?? null,
    country: addr.country ?? null,
  };
}

export function extractCheckoutSnapshot(session: Stripe.Checkout.Session): CheckoutSnapshot {
  const shipping = session.collected_information?.shipping_details ?? null;
  const customer = session.customer_details;
  const shippingFromTotal = session.total_details?.amount_shipping ?? null;
  const shippingFromCost = session.shipping_cost?.amount_total ?? null;

  return {
    subtotal_cents: session.amount_subtotal ?? null,
    tax_cents: session.total_details?.amount_tax ?? 0,
    shipping_cents: shippingFromTotal ?? shippingFromCost ?? 0,
    total_cents: session.amount_total ?? 0,
    currency: (session.currency ?? "usd").toLowerCase(),
    customer_email: customer?.email ?? session.customer_email ?? null,
    shipping_address: mapStripeAddress(shipping?.name ?? customer?.name ?? undefined, shipping?.address),
    billing_address: mapStripeAddress(customer?.name, customer?.address ?? undefined),
    custom_fields: extractCustomFields(session),
  };
}
