/**
 * Admin-only: paginated raw rows from `analytics_events` within a server-time window.
 * - `normalized`: Firestore `created_at` within the window (typical web `ingestWebAnalytics` + normalized writes).
 * - `legacy`: `timestamp` within the window (older `event_type` rows, e.g. `lesson_completed` from callables).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS } from "../analytics/mortarAnalyticsContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const MAX_RANGE_MS = 92 * 24 * 60 * 60 * 1000;

const schema = z.object({
  stream: z.enum(["normalized", "legacy"]),
  created_after_ms: z.number().int(),
  created_before_ms: z.number().int(),
  limit: z.number().int().min(1).max(500).default(500),
  start_after_id: z.string().optional(),
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

function scrubValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toMillis();
  if (Array.isArray(value)) return value.map((v) => scrubValue(v));
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rec)) {
      out[k] = scrubValue(v);
    }
    return out;
  }
  return value;
}

function serializeDoc(id: string, data: DocumentData): Record<string, unknown> {
  const raw: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(data)) {
    raw[k] = scrubValue(v);
  }
  return raw;
}

export const queryAdminAnalyticsEventsDateRange = onCall(
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

    const { stream, created_after_ms: afterMs, created_before_ms: beforeMs, limit, start_after_id } = parsed.data;

    if (beforeMs < afterMs) {
      throw new HttpsError("invalid-argument", "created_before_ms must be >= created_after_ms");
    }
    if (beforeMs - afterMs > MAX_RANGE_MS) {
      throw new HttpsError(
        "invalid-argument",
        "Time window too large (max 92 days); narrow the range or export in multiple downloads"
      );
    }

    const col = db.collection(ANALYTICS_COLLECTIONS.LEGACY_EVENTS);
    const startTs = Timestamp.fromMillis(afterMs);
    const endTs = Timestamp.fromMillis(beforeMs);

    if (stream === "normalized") {
      let q = col
        .where("created_at", ">=", startTs)
        .where("created_at", "<=", endTs)
        .orderBy("created_at", "desc")
        .limit(limit);

      if (start_after_id) {
        const cursor = await col.doc(start_after_id).get();
        if (cursor.exists) {
          q = q.startAfter(cursor);
        }
      }

      const snap = await q.get();
      const events = snap.docs.map((d) => serializeDoc(d.id, d.data()));

      const next_cursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null;
      return { success: true, stream, events, next_cursor };
    }

    // legacy: event_type + timestamp
    let q = col
      .where("timestamp", ">=", startTs)
      .where("timestamp", "<=", endTs)
      .orderBy("timestamp", "desc")
      .limit(limit);

    if (start_after_id) {
      const cursor = await col.doc(start_after_id).get();
      if (cursor.exists) {
        q = q.startAfter(cursor);
      }
    }

    const snap = await q.get();
    const events = snap.docs.map((d) => serializeDoc(d.id, d.data()));

    const next_cursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null;
    return { success: true, stream, events, next_cursor };
  }
);
