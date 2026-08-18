import type Stripe from "stripe";
import type {StripePurchaseType} from "./paymentTypes";

/** Key the shirt size comes back under on the completed session's `custom_fields`. */
export const SHIRT_SIZE_FIELD_KEY = "shirtsize";

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

/**
 * Ask for a shirt size during Stripe Checkout.
 *
 * Tiers that include apparel (VIP) need a size, and Stripe collects it on the
 * page the buyer is already on — no size picker to build, and the answer rides
 * back on the session for the webhook to record. Required, not optional: a
 * missing size is a swag bag nobody can pack.
 */
export function buildShirtSizeCustomField(): Stripe.Checkout.SessionCreateParams.CustomField {
  return {
    key: SHIRT_SIZE_FIELD_KEY,
    label: {type: "custom", custom: "T-shirt size"},
    type: "dropdown",
    dropdown: {
      options: SHIRT_SIZES.map((size) => ({label: size, value: size.toLowerCase()})),
    },
    optional: false,
  };
}

/**
 * Stripe Tax + address collection for Checkout.
 * Enable Stripe Tax in the Stripe Dashboard (Settings → Tax) for `automatic_tax` to apply.
 */
export function buildCheckoutSessionExtras(
  purchaseType: StripePurchaseType
): Pick<
  Stripe.Checkout.SessionCreateParams,
  "automatic_tax" | "billing_address_collection" | "shipping_address_collection"
> {
  const automatic_tax: Stripe.Checkout.SessionCreateParams.AutomaticTax = {enabled: true};

  if (purchaseType === "shop") {
    return {
      automatic_tax,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
    };
  }

  return {
    automatic_tax,
    billing_address_collection: "required",
  };
}
