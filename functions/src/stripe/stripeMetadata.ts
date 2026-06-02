/** Stripe Checkout `metadata` — every value must be a string ≤ 500 chars. */

const STRIPE_METADATA_MAX_VALUE_LEN = 500;

export function toStripeSessionMetadata(
  fields: Record<string, string | undefined | null>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null || value === "") continue;
    const s = String(value);
    out[key] = s.length > STRIPE_METADATA_MAX_VALUE_LEN
      ? s.slice(0, STRIPE_METADATA_MAX_VALUE_LEN)
      : s;
  }
  return out;
}
