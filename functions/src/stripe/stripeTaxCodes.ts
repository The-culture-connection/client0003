import type {StripePurchaseType} from "./paymentTypes";

/**
 * Stripe Tax product tax codes for Checkout `price_data.product_data.tax_code`.
 * @see https://stripe.com/docs/tax/tax-codes
 * Mortar policy: taxable one-time products (Ohio); subscriptions N/A (we use `mode: payment` only).
 */
/** Mortar shop — apparel and physical merch */
const CLOTHING_AND_FOOTWEAR = "txcd_30011000";
/** Digital Curriculum — paid module (self-study / on-demand) */
const TRAINING_SELF_STUDY_WEB = "txcd_20060058";
/** Paid community / curriculum events (instructional sessions) */
const TRAINING_IN_PERSON_OR_WORKSHOP = "txcd_20060044";
/** Flat shipping line on shop checkout — Stripe “Shipping” category */
const SHIPPING = "txcd_92010001";

export function taxCodeForCheckoutLine(
  purchaseType: StripePurchaseType,
  lineMetadata?: Record<string, string>
): string {
  if (lineMetadata?.line_type === "shipping") {
    return SHIPPING;
  }
  switch (purchaseType) {
  case "shop":
    return CLOTHING_AND_FOOTWEAR;
  case "module":
    return TRAINING_SELF_STUDY_WEB;
  case "event":
  case "conference":
    return TRAINING_IN_PERSON_OR_WORKSHOP;
  default:
    return CLOTHING_AND_FOOTWEAR;
  }
}
