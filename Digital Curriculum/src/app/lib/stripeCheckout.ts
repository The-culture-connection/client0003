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

/**
 * Redirect targets built from the host the user is actually on, so Checkout returns
 * to that domain (custom domain, Railway URL, localhost) instead of the server-side
 * `DIGITAL_CURRICULUM_PLATFORM_URL` default. Web only — `ios`/`android` must keep the
 * server's `mobilePaymentReturn` deep-link handoff.
 */
function originRedirects(
  platform: PaymentClientPlatform,
  paths?: { success?: string; cancel?: string }
): { success_url: string; cancel_url: string } | Record<string, never> {
  if (platform !== "web" || typeof window === "undefined") return {};
  const origin = window.location.origin.replace(/\/$/, "");
  if (!origin) return {};
  return {
    success_url: `${origin}${paths?.success ?? "/payment/success"}`,
    cancel_url: `${origin}${paths?.cancel ?? "/payment/cancel"}`,
  };
}

async function startCheckout(
  payload: Record<string, unknown>,
  analyticsEvent: (typeof WEB_ANALYTICS_EVENTS)[keyof typeof WEB_ANALYTICS_EVENTS],
  options?: { openInNewTab?: boolean }
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
  if (options?.openInNewTab) {
    // Keep the app open so an abandoned checkout doesn't kick the user out.
    // Fall back to same-tab navigation if a popup blocker intervenes.
    const win = window.open(data.checkout_url, "_blank", "noopener,noreferrer");
    if (win) return;
  }
  window.location.assign(data.checkout_url);
}

export async function checkoutModule(params: {
  courseId: string;
  moduleId: string;
  curriculumModuleId?: string;
  clientPlatform?: PaymentClientPlatform;
}): Promise<void> {
  const platform = params.clientPlatform ?? "web";
  await startCheckout(
    {
      purchase_type: "module",
      course_id: params.courseId,
      module_id: params.moduleId,
      client_platform: platform,
      ...originRedirects(platform, {
        success: `/payment/success?course_id=${encodeURIComponent(params.courseId)}`,
        cancel: `/courses/${encodeURIComponent(params.courseId)}`,
      }),
    },
    WEB_ANALYTICS_EVENTS.PAYMENT_MODULE_PURCHASE_CLICKED
  );
}

export async function checkoutEventTicket(params: {
  eventId: string;
  collection?: typeof COLLECTION_EVENTS | typeof COLLECTION_EVENTS_MOBILE;
  clientPlatform?: PaymentClientPlatform;
}): Promise<void> {
  const platform = params.clientPlatform ?? "web";
  await startCheckout(
    {
      purchase_type: "event",
      event_id: params.eventId,
      event_collection: params.collection ?? COLLECTION_EVENTS,
      client_platform: platform,
      ...originRedirects(platform),
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
  const platform = params.clientPlatform ?? "web";
  await startCheckout(
    {
      purchase_type: "shop",
      ...originRedirects(platform),
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
      client_platform: platform,
    },
    WEB_ANALYTICS_EVENTS.PAYMENT_SHOP_CHECKOUT_CLICKED,
    { openInNewTab: true }
  );
}
