/**
 * Stripe Checkout — calls `createStripeCheckoutSession` and redirects to Stripe-hosted checkout.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { trackEvent } from "../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { COLLECTION_EVENTS, COLLECTION_EVENTS_MOBILE } from "./events";
import type { CartLine } from "./cart";

export type PaymentClientPlatform = "web" | "ios" | "android";

type CheckoutResponse = {
  checkout_url: string;
  session_id: string;
  order_id: string;
  amount_cents: number;
  currency: string;
};

async function startCheckout(
  payload: Record<string, unknown>,
  analyticsEvent: (typeof WEB_ANALYTICS_EVENTS)[keyof typeof WEB_ANALYTICS_EVENTS]
): Promise<void> {
  const fn = httpsCallable<Record<string, unknown>, CheckoutResponse>(
    functions,
    "createStripeCheckoutSession"
  );
  trackEvent(analyticsEvent, {
    purchase_type: String(payload.purchase_type ?? ""),
  });
  const { data } = await fn(payload);
  trackEvent(WEB_ANALYTICS_EVENTS.PAYMENT_CHECKOUT_REDIRECTED, {
    order_id: data.order_id,
    session_id: data.session_id,
    amount_cents: data.amount_cents,
  });
  window.location.assign(data.checkout_url);
}

export async function checkoutModule(params: {
  courseId: string;
  moduleId: string;
  curriculumModuleId?: string;
  clientPlatform?: PaymentClientPlatform;
}): Promise<void> {
  const origin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
  const coursePath = `/courses/${encodeURIComponent(params.courseId)}`;
  await startCheckout(
    {
      purchase_type: "module",
      course_id: params.courseId,
      module_id: params.moduleId,
      client_platform: params.clientPlatform ?? "web",
      ...(origin
        ? {
            success_url: `${origin}/payment/success?course_id=${encodeURIComponent(params.courseId)}`,
            cancel_url: `${origin}${coursePath}`,
          }
        : {}),
    },
    WEB_ANALYTICS_EVENTS.PAYMENT_MODULE_PURCHASE_CLICKED
  );
}

export async function checkoutEventTicket(params: {
  eventId: string;
  collection?: typeof COLLECTION_EVENTS | typeof COLLECTION_EVENTS_MOBILE;
  clientPlatform?: PaymentClientPlatform;
}): Promise<void> {
  await startCheckout(
    {
      purchase_type: "event",
      event_id: params.eventId,
      event_collection: params.collection ?? COLLECTION_EVENTS,
      client_platform: params.clientPlatform ?? "web",
    },
    WEB_ANALYTICS_EVENTS.PAYMENT_EVENT_TICKET_CLICKED
  );
}

export async function checkoutShopCart(params: {
  lines: CartLine[];
  clientPlatform?: PaymentClientPlatform;
}): Promise<void> {
  if (params.lines.length === 0) {
    throw new Error("Cart is empty");
  }
  await startCheckout(
    {
      purchase_type: "shop",
      lines: params.lines.map((l) => {
        const line: Record<string, string | number> = {
          item_id: l.itemId,
          quantity: l.quantity,
          category: l.category,
        };
        if (l.size != null && l.size !== "") {
          line.size = l.size;
        }
        return line;
      }),
      client_platform: params.clientPlatform ?? "web",
    },
    WEB_ANALYTICS_EVENTS.PAYMENT_SHOP_CHECKOUT_CLICKED
  );
}
