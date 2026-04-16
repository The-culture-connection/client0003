/**
 * Persists a validated web analytics event to `analytics_events` (normalized shape).
 */

import { FieldValue, Firestore } from "firebase-admin/firestore";
import {
  ANALYTICS_COLLECTIONS,
  ANALYTICS_WEB_SCHEMA_VERSION,
  type AnalyticsClientEnvelope,
  type WebAnalyticsEventName,
} from "./mortarAnalyticsContract";

export interface WriteWebAnalyticsEventInput {
  db: Firestore;
  event_name: WebAnalyticsEventName;
  user_id: string | null;
  client: AnalyticsClientEnvelope;
  properties: Record<string, unknown>;
  session_id?: string | null;
  screen_session_id?: string | null;
  route_path?: string | null;
  screen_name?: string | null;
  client_timestamp_ms?: number | null;
  dedupe_key?: string | null;
}

export async function writeWebAnalyticsEvent(input: WriteWebAnalyticsEventInput): Promise<string> {
  const ref = input.db.collection(ANALYTICS_COLLECTIONS.LEGACY_EVENTS).doc();
  await ref.set({
    schema_version: ANALYTICS_WEB_SCHEMA_VERSION,
    source: "web_curriculum_vite",
    event_name: input.event_name,
    user_id: input.user_id,
    created_at: FieldValue.serverTimestamp(),
    client_timestamp_ms: input.client_timestamp_ms ?? null,
    client: input.client,
    session_id: input.session_id ?? null,
    screen_session_id: input.screen_session_id ?? null,
    route_path: input.route_path ?? null,
    screen_name: input.screen_name ?? null,
    properties: input.properties,
    dedupe_key: input.dedupe_key ?? null,
    ingested_via: "callable_ingest_web_analytics",
  });
  return ref.id;
}
