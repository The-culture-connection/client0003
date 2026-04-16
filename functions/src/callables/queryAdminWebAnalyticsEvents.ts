/**
 * Admin-only: recent rows from `analytics_events` (normalized web schema) for QA / raw explorer.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS, ANALYTICS_WEB_SCHEMA_VERSION } from "../analytics/mortarAnalyticsContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const schema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
}

async function assertAnalyticsAdmin(uid: string): Promise<void> {
  const [userRecord, userDoc] = await Promise.all([
    auth.getUser(uid),
    db.collection("users").doc(uid).get(),
  ]);
  const claimRoles = normalizeRoles(userRecord.customClaims?.roles);
  const docRoles = normalizeRoles(userDoc.data()?.roles);
  const merged = new Set<string>([...claimRoles, ...docRoles]);
  if (!merged.has("admin") && !merged.has("superadmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only");
  }
}

function millis(ts: unknown): number | null {
  if (ts instanceof Timestamp) return ts.toMillis();
  return null;
}

function toExplorerRow(id: string, data: DocumentData) {
  return {
    id,
    schema_version: data.schema_version,
    source: data.source ?? null,
    ingested_via: data.ingested_via ?? null,
    event_name: data.event_name ?? null,
    user_id: data.user_id ?? null,
    route_path: data.route_path ?? null,
    screen_session_id: data.screen_session_id ?? null,
    screen_name: data.screen_name ?? null,
    client_timestamp_ms: data.client_timestamp_ms ?? null,
    created_at_ms: millis(data.created_at),
    client: data.client ?? null,
    properties: data.properties ?? null,
    dedupe_key: data.dedupe_key ?? null,
  };
}

export const queryAdminWebAnalyticsEvents = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const tokenRoles = normalizeRoles(request.auth?.token?.roles);
    const tokenHasAdmin = tokenRoles.includes("admin") || tokenRoles.includes("superadmin");
    if (!tokenHasAdmin) {
      await assertAnalyticsAdmin(callerUid);
    }

    const limit = parsed.data.limit;
    const snap = await db
      .collection(ANALYTICS_COLLECTIONS.LEGACY_EVENTS)
      .orderBy("created_at", "desc")
      .limit(Math.min(400, limit * 8))
      .get();

    const filtered = snap.docs.filter(
      (d) => (d.data() as Record<string, unknown>).schema_version === ANALYTICS_WEB_SCHEMA_VERSION
    );
    const events = filtered.slice(0, limit).map((d) => toExplorerRow(d.id, d.data()));

    return { success: true, events };
  }
);
