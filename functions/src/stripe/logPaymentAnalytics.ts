import type {Firestore} from "firebase-admin/firestore";
import {FieldValue} from "firebase-admin/firestore";
import {
  ANALYTICS_COLLECTIONS,
  ANALYTICS_WEB_SCHEMA_VERSION,
  WEB_ANALYTICS_EVENTS,
  type WebAnalyticsEventName,
} from "../analytics/mortarAnalyticsContract";
import type {PaymentClientPlatform} from "./paymentTypes";

const EXPANSION_ANALYTICS_COLLECTION = "expansion_analytics_events";

/** Server-authoritative payment funnel events (web + mobile streams). */
export async function logPaymentAnalytics(
  db: Firestore,
  params: {
    user_id: string;
    event_name: WebAnalyticsEventName;
    purchase_type: string;
    order_id: string;
    amount_cents?: number;
    currency?: string;
    client_platform: PaymentClientPlatform;
    extra?: Record<string, string | number | boolean | null>;
  }
): Promise<void> {
  const properties: Record<string, unknown> = {
    purchase_type: params.purchase_type,
    order_id: params.order_id,
    amount_cents: params.amount_cents ?? null,
    currency: params.currency ?? "usd",
    ...params.extra,
  };

  const platform = params.client_platform === "web" ? "web" : params.client_platform;

  await db.collection(ANALYTICS_COLLECTIONS.LEGACY_EVENTS).add({
    schema_version: ANALYTICS_WEB_SCHEMA_VERSION,
    source: "stripe_webhook",
    event_name: params.event_name,
    user_id: params.user_id,
    created_at: FieldValue.serverTimestamp(),
    client_timestamp_ms: Date.now(),
    client: {platform, app_version: "cloud-functions"},
    session_id: null,
    screen_session_id: null,
    route_path: null,
    screen_name: "payments",
    properties,
    dedupe_key: `payment:${params.order_id}:${params.event_name}`,
    ingested_via: "stripe_fulfillment",
  });

  if (platform === "ios" || platform === "android") {
    await db.collection(EXPANSION_ANALYTICS_COLLECTION).add({
      event_name: params.event_name,
      user_id: params.user_id,
      session_id: `server_${params.order_id}`,
      screen: "payments",
      route: "/payments",
      client_emitted_at: FieldValue.serverTimestamp(),
      ingested_at: FieldValue.serverTimestamp(),
      properties,
    });
  }
}

export const PAYMENT_ANALYTICS = {
  WEBHOOK_SUCCEEDED: WEB_ANALYTICS_EVENTS.PAYMENT_WEBHOOK_SUCCEEDED,
  WEBHOOK_FAILED: WEB_ANALYTICS_EVENTS.PAYMENT_WEBHOOK_FAILED,
} as const;
