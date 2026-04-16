/**
 * Persists a validated event to the canonical raw stream (Admin SDK).
 */

import {FieldValue, Firestore} from "firebase-admin/firestore";
import {
  ANALYTICS_COLLECTIONS,
  ANALYTICS_SCHEMA_VERSION,
  type AnalyticsClientEnvelope,
  type AnalyticsEventName,
} from "./mortarAnalyticsContract";

export interface WriteRawAnalyticsEventInput {
  db: Firestore;
  event_name: AnalyticsEventName;
  user_id: string;
  client: AnalyticsClientEnvelope;
  properties: Record<string, unknown>;
  session_id?: string | null;
  dedupe_key?: string | null;
  ingested_via: "callable_log_analytics_event" | "system";
}

export async function writeRawAnalyticsEvent(input: WriteRawAnalyticsEventInput): Promise<string> {
  const ref = input.db.collection(ANALYTICS_COLLECTIONS.RAW_EVENTS).doc();
  await ref.set({
    schema_version: ANALYTICS_SCHEMA_VERSION,
    event_name: input.event_name,
    user_id: input.user_id,
    created_at: FieldValue.serverTimestamp(),
    ingested_via: input.ingested_via,
    client: input.client,
    session_id: input.session_id ?? null,
    properties: input.properties,
    dedupe_key: input.dedupe_key ?? null,
  });
  return ref.id;
}
