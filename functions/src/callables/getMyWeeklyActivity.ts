/**
 * Signed-in users: read their own normalized web `analytics_events` for a calendar week window.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS, ANALYTICS_WEB_SCHEMA_VERSION } from "../analytics/mortarAnalyticsContract";
import { nullishUndefined } from "../helpers/callableNullishZod";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const MAX_RANGE_MS = 8 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 250;

const schema = z.object({
  week_start_ms: z.number().int(),
  week_end_ms: z.number().int(),
  limit: nullishUndefined(z.number().int().min(1).max(MAX_EVENTS).default(MAX_EVENTS)),
});

function millis(ts: unknown): number | null {
  if (ts instanceof Timestamp) return ts.toMillis();
  return null;
}

function toActivityRow(id: string, data: DocumentData) {
  return {
    id,
    event_name: typeof data.event_name === "string" ? data.event_name : "unknown",
    route_path: typeof data.route_path === "string" ? data.route_path : null,
    screen_name: typeof data.screen_name === "string" ? data.screen_name : null,
    created_at_ms: millis(data.created_at),
    client_timestamp_ms:
      typeof data.client_timestamp_ms === "number" ? data.client_timestamp_ms : null,
    properties:
      data.properties && typeof data.properties === "object" ?
        (data.properties as Record<string, unknown>) :
        {},
  };
}

export const getMyWeeklyActivity = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.issues.map((e) => e.message).join("; "));
    }

    const { week_start_ms: startMs, week_end_ms: endMs, limit } = parsed.data;
    if (endMs < startMs) {
      throw new HttpsError("invalid-argument", "week_end_ms must be on or after week_start_ms");
    }
    if (endMs - startMs > MAX_RANGE_MS) {
      throw new HttpsError("invalid-argument", "Week range too large.");
    }

    const startTs = Timestamp.fromMillis(startMs);
    const endTs = Timestamp.fromMillis(endMs);

    const snap = await db
      .collection(ANALYTICS_COLLECTIONS.LEGACY_EVENTS)
      .where("user_id", "==", uid)
      .where("created_at", ">=", startTs)
      .where("created_at", "<=", endTs)
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();

    const events = snap.docs
      .filter((d) => (d.data() as Record<string, unknown>).schema_version === ANALYTICS_WEB_SCHEMA_VERSION)
      .map((d) => toActivityRow(d.id, d.data()));

    return {
      ok: true,
      week_start_ms: startMs,
      week_end_ms: endMs,
      event_count: events.length,
      events,
    };
  }
);
