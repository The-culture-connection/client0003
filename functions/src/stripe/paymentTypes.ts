/** Firestore + Stripe metadata for Mortar payments. */

export const PAYMENT_ORDERS_COLLECTION = "payment_orders";
export const SHOP_ORDERS_COLLECTION = "shop_orders";
export const SHOP_ITEMS_COLLECTION = "shopItems";
export const COLLECTION_EVENTS = "events";
export const COLLECTION_EVENTS_MOBILE = "events_mobile";
export const COURSES_COLLECTION = "courses";

export type StripePurchaseType = "module" | "event" | "shop";

export type PaymentOrderStatus = "pending" | "completed" | "failed" | "expired";

export type PaymentClientPlatform = "web" | "ios" | "android";

export interface PaymentOrderDoc {
  uid: string;
  purchase_type: StripePurchaseType;
  status: PaymentOrderStatus;
  amount_cents: number;
  currency: string;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  client_platform: PaymentClientPlatform;
  /** Purchase-specific ids (module, event, shop cart snapshot). */
  metadata: Record<string, string>;
  created_at: unknown;
  updated_at: unknown;
  completed_at?: unknown | null;
  failure_reason?: string | null;
}
