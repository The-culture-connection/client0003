import type {StripePurchaseType} from "./paymentTypes";

/**
 * Stripe Tax product tax codes for Checkout `price_data.product_data.tax_code`.
 * @see https://stripe.com/docs/tax/tax-categories
 * Mortar policy: taxable one-time products (Ohio); subscriptions N/A (we use `mode: payment` only).
 */
const TANGIBLE_GOODS = "txcd_20030000";
const TRAINING_SERVICES = "txcd_92010001";
const EVENT_ADMISSION = "txcd_19020000";
const SHIPPING = "txcd_92020001";

export function taxCodeForCheckoutLine(
  purchaseType: StripePurchaseType,
  lineMetadata?: Record<string, string>
): string {
  if (lineMetadata?.line_type === "shipping") {
    return SHIPPING;
  }
  switch (purchaseType) {
  case "shop":
    return TANGIBLE_GOODS;
  case "module":
    return TRAINING_SERVICES;
  case "event":
    return EVENT_ADMISSION;
  default:
    return TANGIBLE_GOODS;
  }
}
