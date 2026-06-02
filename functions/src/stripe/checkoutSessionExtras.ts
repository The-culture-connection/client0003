import type Stripe from "stripe";
import type {StripePurchaseType} from "./paymentTypes";

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
