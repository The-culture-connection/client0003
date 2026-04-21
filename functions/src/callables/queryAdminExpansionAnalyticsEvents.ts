/**
 * Admin-only: paginated raw rows from `expansion_analytics_events` for QA / CSV export.
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
  limit: z.number().int().min(1).max(500).default(200),
  start_after_id: z.string().optional(),
  /** Inclusive lower bound on `ingested_at` (epoch ms). */
  ingested_after_ms: z.number().int().optional(),
  /** Inclusive upper bound on `ingested_at` (epoch ms). */
  ingested_before_ms: z.number().int().optional(),
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

function toRow(id: string, data: DocumentData) {
  const ce = data.client_emitted_at;
  const ing = data.ingested_at;
  return {
    id,
    event_name: data.event_name ?? null,
    user_id: data.user_id ?? null,
    session_id: data.session_id ?? null,
    screen: data.screen ?? null,
    route: data.route ?? null,
    client_emitted_at_ms: millis(ce),
    ingested_at_ms: millis(ing),
    client_emitted_at_iso: ce instanceof Timestamp ? ce.toDate().toISOString() : null,
    ingested_at_iso: ing instanceof Timestamp ? ing.toDate().toISOString() : null,
    properties: data.properties ?? null,
  };
}

export const queryAdminExpansionAnalyticsEvents = onCall(
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
    const startAfterId = parsed.data.start_after_id;
    const afterMs = parsed.data.ingested_after_ms;
    const beforeMs = parsed.data.ingested_before_ms;

    if (afterMs != null && beforeMs != null && beforeMs < afterMs) {
      throw new HttpsError("invalid-argument", "ingested_before_ms must be >= ingested_after_ms");
    }
    if (afterMs != null && beforeMs != null && beforeMs - afterMs > MAX_RANGE_MS) {
      throw new HttpsError(
        "invalid-argument",
        "ingested time window too large (max 92 days); narrow the range or export in chunks"
      );
    }

    let q = db
      .collection(ANALYTICS_COLLECTIONS.EXPANSION_ANALYTICS_EVENTS)
      .orderBy("ingested_at", "desc");

    if (afterMs != null) {
      q = q.where("ingested_at", ">=", Timestamp.fromMillis(afterMs));
    }
    if (beforeMs != null) {
      q = q.where("ingested_at", "<=", Timestamp.fromMillis(beforeMs));
    }

    q = q.limit(limit);

    if (startAfterId) {
      const cursor = await db.collection(ANALYTICS_COLLECTIONS.EXPANSION_ANALYTICS_EVENTS).doc(startAfterId).get();
      if (cursor.exists) {
        q = q.startAfter(cursor);
      }
    }

    const snap = await q.get();
    const events = snap.docs.map((d) => toRow(d.id, d.data()));
    const next_cursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null;

    return { success: true, events, next_cursor };
  }
);
